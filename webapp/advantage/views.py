# Standard library
from datetime import datetime, timedelta, timezone

# Packages
from dateutil.parser import parse
import flask
import talisker.requests
import pytz
from requests.exceptions import HTTPError
from webargs.fields import String, Boolean

# Local
from webapp.decorators import advantage_checks
from webapp.login import user_info
from webapp.advantage.parser import use_kwargs
from webapp.advantage.api import (
    UAContractsAPI,
    CannotCancelLastContractError,
    UnauthorizedError,
    UAContractsUserHasNoAccount,
    UAContractsAPIError,
    UAContractsAPIErrorView,
)

from webapp.advantage.schemas import (
    post_advantage_subscriptions,
    post_anonymised_customer_info,
    cancel_advantage_subscriptions,
    post_customer_info,
    ensure_purchase_account,
    post_payment_method,
)


session = talisker.requests.get_session()


@advantage_checks(check_list=["is_maintenance", "view_need_user"])
@use_kwargs({"subscription": String(), "email": String()}, location="query")
def advantage_view(**kwargs):
    is_test_backend = kwargs.get("test_backend")
    api_url = kwargs.get("api_url")
    stripe_publishable_key = kwargs["stripe_publishable_key"]
    token = kwargs.get("token")
    open_subscription = kwargs.get("subscription", None)

    personal_account = None
    new_subscription_id = None
    new_subscription_start_date = None
    pending_purchase_id = None

    enterprise_contracts = {}
    previous_purchase_ids = {"monthly": "", "yearly": ""}
    total_enterprise_contracts = 0

    monthly_info = {
        "total_subscriptions": 0,
        "has_monthly": False,
        "next_payment": {},
    }

    advantage = UAContractsAPI(
        session, token, api_url=api_url, is_for_view=True
    )

    # Support admin "view as" functionality.
    email = kwargs.get("email", "").strip()
    accounts = advantage.get_accounts(email=email)

    for account in accounts:
        monthly_purchased_products = {}
        yearly_purchased_products = {}
        account["contracts"] = advantage.get_account_contracts(account["id"])

        all_subscriptions = advantage.get_account_subscriptions(
            account_id=account["id"],
            marketplace="canonical-ua",
        )

        monthly_subscriptions = []
        yearly_subscriptions = []
        for subscription in all_subscriptions:
            period = subscription["subscription"]["period"]
            status = subscription["subscription"]["status"]

            if status not in ["active", "locked"]:
                continue

            if subscription.get("pendingPurchases"):
                pending_purchase_id = subscription.get("pendingPurchases")[0]

            previous_purchase_ids[period] = subscription.get("lastPurchaseID")

            if subscription["subscription"]["period"] == "yearly":
                yearly_subscriptions.append(subscription)
                continue

            monthly_subscriptions.append(subscription)

        for subscription in monthly_subscriptions:
            purchased_products = subscription.get("purchasedProductListings")
            if purchased_products is None:
                continue

            for purchased_product_listing in purchased_products:
                product_listing = purchased_product_listing["productListing"]
                product_id = product_listing["productID"]
                quantity = purchased_product_listing["value"]
                monthly_purchased_products[product_id] = {
                    "quantity": quantity,
                    "price": product_listing["price"],
                    "product_listing_id": product_listing["id"],
                }

            _prepare_monthly_info(monthly_info, subscription, advantage)

        for subscription in yearly_subscriptions:
            purchased_products = subscription.get("purchasedProductListings")
            if purchased_products is None:
                continue

            for purchased_product_listing in purchased_products:
                product_listing = purchased_product_listing["productListing"]
                product_id = product_listing["productID"]
                quantity = purchased_product_listing["value"]
                yearly_purchased_products[product_id] = {
                    "quantity": quantity,
                    "price": product_listing["price"],
                    "product_listing_id": product_listing["id"],
                }

        for contract in account["contracts"]:
            contract_info = contract["contractInfo"]
            if not contract_info.get("items"):
                # TODO(frankban): clean up existing contracts with no items in
                # production.
                continue

            contract_id = contract_info["id"]
            contract["token"] = advantage.get_contract_token(contract_id)

            if contract_info.get("origin", "") == "free":
                personal_account = account
                personal_account["free_token"] = contract["token"]

                continue

            entitlements = {}
            for entitlement in contract_info["resourceEntitlements"]:
                contract["supportLevel"] = "-"
                if entitlement["type"] == "support":
                    affordance = entitlement["affordances"]
                    contract["supportLevel"] = affordance["supportLevel"]

                    continue

                entitlement_type = entitlement["type"]
                entitlements[entitlement_type] = True
            contract["entitlements"] = entitlements

            created_at = parse(contract_info["createdAt"])
            format_create = created_at.strftime("%d %B %Y")
            contract["contractInfo"]["createdAtFormatted"] = format_create
            contract["contractInfo"]["status"] = "active"

            time_now = datetime.utcnow().replace(tzinfo=pytz.utc)

            if (
                not new_subscription_start_date
                or created_at > new_subscription_start_date
            ):
                new_subscription_start_date = created_at
                new_subscription_id = contract["contractInfo"]["id"]

            effective_to = parse(contract_info["effectiveTo"])
            format_effective = effective_to.strftime("%d %B %Y")
            contract["contractInfo"]["effectiveToFormatted"] = format_effective

            if effective_to < time_now:
                contract["contractInfo"]["status"] = "expired"
                restart_date = time_now - timedelta(days=1)
                contract["contractInfo"]["expired_restart_date"] = restart_date

            date_difference = effective_to - time_now
            contract["expiring"] = date_difference.days <= 30
            contract["contractInfo"]["daysTillExpiry"] = date_difference.days

            try:
                contract["renewal"] = _make_renewal(
                    advantage, contract["contractInfo"]
                )
            except KeyError:
                flask.current_app.extensions["sentry"].captureException()
                contract["renewal"] = None

            enterprise_contract = enterprise_contracts.setdefault(
                contract["accountInfo"]["name"], []
            )

            product_name = contract["contractInfo"]["products"][0]

            contract["productID"] = product_name
            contract["is_detached"] = False
            contract["machineCount"] = 0
            contract["rowMachineCount"] = 0

            allowances = contract_info.get("allowances")
            if (
                allowances
                and len(allowances) > 0
                and allowances[0]["metric"] == "units"
            ):
                contract["rowMachineCount"] = allowances[0]["value"]

            if product_name in yearly_purchased_products:
                purchased_product = yearly_purchased_products[product_name]
                contract["price_per_unit"] = purchased_product["price"]
                contract["machineCount"] = purchased_product["quantity"]
                contract["product_listing_id"] = purchased_product[
                    "product_listing_id"
                ]
                contract["period"] = "yearly"

                if contract["contractInfo"]["id"] == open_subscription:
                    enterprise_contract.insert(0, contract)
                elif contract["contractInfo"]["id"] == new_subscription_id:
                    enterprise_contract.insert(0, contract)
                else:
                    enterprise_contract.append(contract)

                if contract["contractInfo"]["status"] != "expired":
                    total_enterprise_contracts += 1

            if product_name in monthly_purchased_products:
                contract = contract.copy()
                purchased_product = monthly_purchased_products[product_name]
                contract["price_per_unit"] = purchased_product["price"]
                contract["machineCount"] = purchased_product["quantity"]
                contract["is_cancelable"] = True
                contract["product_listing_id"] = purchased_product[
                    "product_listing_id"
                ]
                contract["period"] = "monthly"

                if contract["contractInfo"]["id"] == open_subscription:
                    enterprise_contract.insert(0, contract)
                elif contract["contractInfo"]["id"] == new_subscription_id:
                    enterprise_contract.insert(0, contract)
                else:
                    enterprise_contract.append(contract)

                if contract["contractInfo"]["status"] != "expired":
                    total_enterprise_contracts += 1

            if (
                product_name not in yearly_purchased_products
                and product_name not in monthly_purchased_products
            ):
                contract["is_detached"] = True

                if contract["contractInfo"]["id"] == open_subscription:
                    enterprise_contract.insert(0, contract)
                elif contract["contractInfo"]["id"] == new_subscription_id:
                    enterprise_contract.insert(0, contract)
                else:
                    enterprise_contract.append(contract)

                if contract["contractInfo"]["status"] != "expired":
                    total_enterprise_contracts += 1

    return flask.render_template(
        "advantage/index.html",
        accounts=accounts,
        monthly_information=monthly_info,
        total_enterprise_contracts=total_enterprise_contracts,
        pending_purchase_id=pending_purchase_id,
        enterprise_contracts=enterprise_contracts,
        previous_purchase_ids=previous_purchase_ids,
        personal_account=personal_account,
        open_subscription=open_subscription,
        new_subscription_id=new_subscription_id,
        stripe_publishable_key=stripe_publishable_key,
        is_test_backend=is_test_backend,
    )


@advantage_checks(check_list=["is_maintenance"])
def advantage_shop_view(**kwargs):
    is_test_backend = kwargs.get("test_backend")
    api_url = kwargs.get("api_url")
    stripe_publishable_key = kwargs.get("stripe_publishable_key")
    token = kwargs.get("token")

    account = None
    previous_purchase_ids = {"monthly": "", "yearly": ""}
    advantage = UAContractsAPI(
        session, None, api_url=api_url, is_for_view=True
    )

    if user_info(flask.session):
        advantage = UAContractsAPI(
            session, token, api_url=api_url, is_for_view=True
        )

        if flask.session.get("guest_authentication_token"):
            flask.session.pop("guest_authentication_token")

        try:
            account = advantage.get_purchase_account()
        except UAContractsUserHasNoAccount:
            # There is no purchase account yet for this user.
            # One will need to be created later, but this is an expected
            # condition.

            pass

        if account:
            subscriptions = advantage.get_account_subscriptions(
                account_id=account["id"],
                marketplace="canonical-ua",
                filters={"status": "active"},
            )

            for subscription in subscriptions:
                period = subscription["subscription"]["period"]
                previous_purchase_ids[period] = subscription["lastPurchaseID"]

    listings = advantage.get_product_listings("canonical-ua")
    product_listings = listings.get("productListings")
    if not product_listings:
        # For the time being, no product listings means the shop has not been
        # activated, so fallback to shopify. This should become an error later.
        return flask.redirect("https://buy.ubuntu.com/")

    products = {product["id"]: product for product in listings["products"]}

    website_listing = []
    for listing in product_listings:
        if "price" not in listing:
            continue

        listing["product"] = products[listing["productID"]]

        website_listing.append(listing)

    return flask.render_template(
        "advantage/subscribe/index.html",
        is_test_backend=is_test_backend,
        stripe_publishable_key=stripe_publishable_key,
        account=account,
        previous_purchase_ids=previous_purchase_ids,
        product_listings=website_listing,
    )


@advantage_checks(check_list=["is_maintenance", "view_need_user"])
def payment_methods_view(**kwargs):
    is_test_backend = kwargs.get("test_backend")
    stripe_publishable_key = kwargs["stripe_publishable_key"]
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")

    advantage = UAContractsAPI(
        session, token, api_url=api_url, is_for_view=True
    )

    try:
        account = advantage.get_purchase_account()
    except UAContractsUserHasNoAccount as error:
        raise UAContractsAPIErrorView(error)

    subscriptions = advantage.get_account_subscriptions(
        account_id=account["id"],
        marketplace="canonical-ua",
        filters={"status": "locked"},
    )

    pending_purchase_id = ""
    for subscription in subscriptions:
        if subscription.get("pendingPurchases"):
            pending_purchase_id = subscription.get("pendingPurchases")[0]
            break

    account_info = advantage.get_customer_info(account["id"])
    customer_info = account_info["customerInfo"]
    default_payment_method = customer_info.get("defaultPaymentMethod")

    return flask.render_template(
        "account/payment-methods/index.html",
        stripe_publishable_key=stripe_publishable_key,
        is_test_backend=is_test_backend,
        default_payment_method=default_payment_method,
        pending_purchase_id=pending_purchase_id,
        account_id=account["id"],
    )


@advantage_checks(check_list=["is_maintenance"])
@use_kwargs({"email": String()}, location="query")
def advantage_thanks_view(**kwargs):
    email = kwargs.get("email")

    if user_info(flask.session):
        return flask.redirect("/advantage")

    return flask.render_template(
        "advantage/subscribe/thank-you.html",
        email=email,
    )


@advantage_checks(check_list=["need_user_or_guest"])
@use_kwargs(post_advantage_subscriptions, location="json")
def post_advantage_subscriptions(preview, **kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    token_type = kwargs.get("token_type")
    account_id = kwargs.get("account_id")
    previous_purchase_id = kwargs.get("previous_purchase_id")
    period = kwargs.get("period")
    products = kwargs.get("products")
    resizing = kwargs.get("resizing", False)

    advantage = UAContractsAPI(
        session, token, token_type=token_type, api_url=api_url
    )

    current_subscription = {}
    if user_info(flask.session):
        subscriptions = advantage.get_account_subscriptions(
            account_id=account_id,
            marketplace="canonical-ua",
            filters={"status": "active"},
        )

        for subscription in subscriptions:
            if subscription["subscription"]["period"] == period:
                current_subscription = subscription

    # If there is a subscription we get the current metric
    # value for each product listing so we can generate a
    # purchase request with updated quantities later.
    # If we resize we want to override the existing value
    subscribed_quantities = {}
    if not resizing and current_subscription:
        for item in current_subscription["purchasedProductListings"]:
            product_listing_id = item["productListing"]["id"]
            subscribed_quantities[product_listing_id] = item["value"]

    purchase_items = []
    for product in products:
        product_listing_id = product["product_listing_id"]
        metric_value = product["quantity"] + subscribed_quantities.get(
            product_listing_id, 0
        )

        purchase_items.append(
            {
                "productListingID": product_listing_id,
                "metric": "active-machines",
                "value": metric_value,
            }
        )

    purchase_request = {
        "accountID": account_id,
        "purchaseItems": purchase_items,
        "previousPurchaseID": previous_purchase_id,
    }

    try:
        if not preview:
            purchase = advantage.purchase_from_marketplace(
                marketplace="canonical-ua", purchase_request=purchase_request
            )
        else:
            purchase = advantage.preview_purchase_from_marketplace(
                marketplace="canonical-ua", purchase_request=purchase_request
            )
    except CannotCancelLastContractError as error:
        raise UAContractsAPIError(error)

    return flask.jsonify(purchase), 200


@advantage_checks(check_list=["need_user"])
@use_kwargs(cancel_advantage_subscriptions, location="json")
def cancel_advantage_subscriptions(**kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    account_id = kwargs.get("account_id")
    previous_purchase_id = kwargs.get("previous_purchase_id")
    product_listing_id = kwargs.get("product_listing_id")

    advantage = UAContractsAPI(session, token, api_url=api_url)

    monthly_subscriptions = advantage.get_account_subscriptions(
        account_id=account_id,
        marketplace="canonical-ua",
        filters={"status": "active", "period": "monthly"},
    )

    if not monthly_subscriptions:
        return flask.jsonify({"errors": "no monthly subscriptions found"}), 400

    monthly_subscription = monthly_subscriptions[0]

    purchase_request = {
        "accountID": account_id,
        "purchaseItems": [
            {
                "productListingID": product_listing_id,
                "metric": "active-machines",
                "value": 0,
                "delete": True,
            }
        ],
        "previousPurchaseID": previous_purchase_id,
    }

    try:
        purchase = advantage.purchase_from_marketplace(
            marketplace="canonical-ua", purchase_request=purchase_request
        )
    except CannotCancelLastContractError:
        advantage.cancel_subscription(
            subscription_id=monthly_subscription["subscription"]["id"]
        )

        return (
            flask.jsonify({"message": "Subscription Cancelled"}),
            200,
        )

    return flask.jsonify(purchase), 200


@advantage_checks(check_list=["need_user_or_guest"])
@use_kwargs(post_anonymised_customer_info, location="json")
def post_anonymised_customer_info(**kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    token_type = kwargs.get("token_type")
    account_id = kwargs.get("account_id")
    name = kwargs.get("name")
    address = kwargs.get("address")
    tax_id = kwargs.get("tax_id")

    advantage = UAContractsAPI(
        session, token, token_type=token_type, api_url=api_url
    )

    return advantage.put_anonymous_customer_info(
        account_id, name, address, tax_id
    )


@advantage_checks(check_list=["need_user"])
@use_kwargs(post_payment_method, location="json")
def post_payment_method(**kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    account_id = kwargs.get("account_id")
    payment_method_id = kwargs.get("payment_method_id")

    advantage = UAContractsAPI(session, token, api_url=api_url)

    return advantage.put_payment_method(account_id, payment_method_id)


@advantage_checks(check_list=["need_user"])
@use_kwargs({"should_auto_renew": Boolean()}, location="json")
def post_auto_renewal_settings(**kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    should_auto_renew = kwargs.get("should_auto_renew", False)

    advantage = UAContractsAPI(session, token, api_url=api_url)
    accounts = advantage.get_accounts()

    for account in accounts:
        monthly_subscriptions = advantage.get_account_subscriptions(
            account_id=account["id"],
            marketplace="canonical-ua",
            filters={"status": "active", "period": "monthly"},
        )

        for subscription in monthly_subscriptions:
            advantage.post_subscription_auto_renewal(
                subscription_id=subscription["subscription"]["id"],
                should_auto_renew=should_auto_renew,
            )

    return (
        flask.jsonify({"message": "subscription renewal status was changed"}),
        200,
    )


@advantage_checks(check_list=["need_user"])
def get_customer_info(account_id, **kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")

    response = {"success": False, "data": {}}

    try:
        advantage = UAContractsAPI(session, token, api_url=api_url)
        response["data"] = advantage.get_customer_info(account_id)
        response["success"] = True
    except HTTPError as error:
        if error.response.status_code == 404:
            response["data"] = error.response.json()
            response["success"] = False
        else:
            flask.current_app.extensions["sentry"].captureException()
            raise error

    return response


@advantage_checks(check_list=["need_user_or_guest"])
@use_kwargs(post_customer_info, location="json")
def post_customer_info(**kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    token_type = kwargs.get("token_type")
    payment_method_id = kwargs.get("payment_method_id")
    account_id = kwargs.get("account_id")
    address = kwargs.get("address")
    name = kwargs.get("name")
    tax_id = kwargs.get("tax_id")

    advantage = UAContractsAPI(
        session, token, token_type=token_type, api_url=api_url
    )

    return advantage.put_customer_info(
        account_id, payment_method_id, address, name, tax_id
    )


@advantage_checks(check_list=["need_user_or_guest"])
def post_stripe_invoice_id(tx_type, tx_id, invoice_id, **kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    token_type = kwargs.get("token_type")

    advantage = UAContractsAPI(
        session, token, token_type=token_type, api_url=api_url
    )

    response = advantage.post_stripe_invoice_id(tx_type, tx_id, invoice_id)

    if response is None:
        return flask.jsonify({"message": "invoice updated"})

    return response


@advantage_checks(check_list=["need_user_or_guest"])
def get_purchase(purchase_id, **kwargs):
    api_url = kwargs.get("api_url")
    token = kwargs.get("token")
    token_type = kwargs.get("token_type")

    advantage = UAContractsAPI(
        session, token, token_type=token_type, api_url=api_url
    )

    return advantage.get_purchase(purchase_id)


@advantage_checks()
@use_kwargs(ensure_purchase_account, location="json")
def ensure_purchase_account(**kwargs):
    """
    Returns an object with the ID of an account a user can make
    purchases on. If the user is not logged in, the object also
    contains an auth token required for subsequent calls to the
    contract API.
    """

    api_url = kwargs.get("api_url")
    email = kwargs.get("email")
    account_name = kwargs.get("account_name")
    payment_method_id = kwargs.get("payment_method_id")
    country = kwargs.get("country")

    token = None
    if user_info(flask.session):
        token = flask.session["authentication_token"]

    advantage = UAContractsAPI(session, token, api_url=api_url)

    try:
        account = advantage.ensure_purchase_account(
            email=email,
            account_name=account_name,
            payment_method_id=payment_method_id,
            country=country,
        )
    except UnauthorizedError as err:
        # This kind of errors are handled js side.
        return err.asdict(), 200
    except HTTPError as err:
        flask.current_app.extensions["sentry"].captureException()
        return err.response.content, 500

    # The guest authentication token is included in the response only when the
    # user is not logged in.
    token = account.get("token")

    if token:
        flask.session["guest_authentication_token"] = token

    return flask.jsonify(account), 200


@advantage_checks(check_list=["need_user"])
def get_renewal(renewal_id, **kwargs):
    token = kwargs.get("token")
    api_url = kwargs.get("api_url")

    advantage = UAContractsAPI(session, token, api_url=api_url)

    return advantage.get_renewal(renewal_id)


@advantage_checks(check_list=["need_user"])
def accept_renewal(renewal_id, **kwargs):
    token = kwargs.get("token")
    api_url = kwargs.get("api_url")

    advantage = UAContractsAPI(session, token, api_url=api_url)

    return advantage.accept_renewal(renewal_id)


@advantage_checks(check_list=["is_maintenance", "view_need_user"])
def account_view(**kwargs):
    email = flask.session["openid"]["email"]

    return flask.render_template(
        "account/index.html",
        email=email,
    )


def _prepare_monthly_info(monthly_info, subscription, advantage):
    purchased_products = subscription.get("purchasedProductListings")
    subscription_info = subscription.get("subscription")
    subscription_id = subscription_info.get("id")
    is_renewing = subscription_info.get("autoRenew", False)

    monthly_info["total_subscriptions"] += len(purchased_products)
    monthly_info["has_monthly"] = True
    monthly_info["id"] = subscription_id
    monthly_info["is_auto_renewal_enabled"] = is_renewing

    if is_renewing:
        renewal_info = advantage.get_subscription_auto_renewal(subscription_id)
        last_renewal = parse(renewal_info["subscriptionStartOfCycle"])
        next_renewal = parse(renewal_info["subscriptionEndOfCycle"])
        total = renewal_info["total"] / 100
        currency = renewal_info["currency"]

        monthly_info["last_payment_date"] = last_renewal.strftime("%d %B %Y")
        monthly_info["next_payment"] = {
            "date": next_renewal.strftime("%d %B %Y"),
            "amount": f"{total} {currency}",
        }


def _make_renewal(advantage, contract_info):
    """Return the renewal as present in the given info, or None."""
    renewals = contract_info.get("renewals")
    if not renewals:
        return None

    sorted_renewals = sorted(
        (r for r in renewals if r["status"] not in ["lost", "closed"]),
        key=lambda renewal: parse(renewal["start"]),
    )

    if len(sorted_renewals) == 0:
        return None

    renewal = sorted_renewals[0]

    # If the renewal is processing, we need to find out
    # whether payment failed and requires user action,
    # which is information only available in the fuller
    # renewal object get_renewal gives us.
    if renewal["status"] == "processing":
        renewal = advantage.get_renewal(renewal["id"])

    renewal["renewable"] = False

    if renewal["status"] == "done":
        try:
            renewal_modified_date = parse(renewal["lastModified"])
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)

            renewal["recently_renewed"] = one_hour_ago < renewal_modified_date
        except KeyError:
            renewal["recently_renewed"] = False

    # Only actionable renewals are renewable.
    # If "actionable" isn't set, it's not actionable
    # If "actionable" IS set, but not true, it's not actionable
    if "actionable" not in renewal:
        renewal["actionable"] = False
        return renewal
    elif not renewal["actionable"]:
        return renewal

    # The renewal is renewable only during its time window.
    start = parse(renewal["start"])
    end = parse(renewal["end"])
    if not (start <= datetime.now(timezone.utc) <= end):
        return renewal

    # Pending renewals are renewable.
    if renewal["status"] == "pending":
        renewal["renewable"] = True
        return renewal

    # Renewals not pending or processing are never renewable.
    if renewal["status"] != "processing":
        return renewal

    invoices = renewal.get("stripeInvoices")
    if invoices:
        invoice = invoices[-1]
        renewal["renewable"] = (
            invoice["pi_status"] == "requires_payment_method"
            or invoice["pi_status"] == "requires_action"
        ) and invoice["subscription_status"] == "incomplete"

    return renewal
