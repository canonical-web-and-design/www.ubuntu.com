# Standard library
import json
import os
import re
import datetime

# Packages
import feedparser
import flask
import talisker.requests
from canonicalwebteam.blog import BlogViews
from canonicalwebteam.blog.flask import build_blueprint
from canonicalwebteam.store_api.stores.snapcraft import SnapcraftStoreApi
from geolite2 import geolite2
from requests.exceptions import HTTPError

# Local
from webapp import auth
from webapp.api import advantage


ip_reader = geolite2.reader()
store_api = SnapcraftStoreApi(session=talisker.requests.get_session())


def download_thank_you(category):
    context = {"http_host": flask.request.host}

    version = flask.request.args.get("version", "")
    architecture = flask.request.args.get("architecture", "")

    # Sanitise for paths
    # (https://bugs.launchpad.net/ubuntu-website-content/+bug/1586361)
    version_pattern = re.compile(r"(\d+(?:\.\d+)+).*")
    architecture = architecture.replace("..", "")
    architecture = architecture.replace("/", "+").replace(" ", "+")

    if architecture and version_pattern.match(version):
        context["start_download"] = version and architecture
        context["version"] = version
        context["architecture"] = architecture

    # Add mirrors
    mirrors_path = os.path.join(os.getcwd(), "etc/ubuntu-mirrors-rss.xml")

    try:
        with open(mirrors_path) as rss:
            mirrors = feedparser.parse(rss.read()).entries
    except IOError:
        mirrors = []

    # Check country code
    country_code = "NO_COUNTRY_CODE"
    ip_location = ip_reader.get(flask.request.remote_addr)
    mirror_list = []

    if ip_location:
        country_code = ip_location["country"]["iso_code"]

        mirror_list = [
            {"link": mirror["link"], "bandwidth": mirror["mirror_bandwidth"]}
            for mirror in mirrors
            if mirror["mirror_countrycode"] == country_code
        ]
    context["mirror_list"] = json.dumps(mirror_list)

    return (
        flask.render_template(
            f"download/{category}/thank-you.html", **context
        ),
        {"Cache-Control": "no-cache"},
    )


def releasenotes_redirect():
    """
    View to redirect to https://wiki.ubuntu.com/ URLs for release notes.

    This used to be done in the Apache frontend, but that is going away
    to be replace by the content-cache.

    Old apache redirects: https://pastebin.canonical.com/p/3TXyyNkWkg/
    """

    ver = flask.request.args.get("ver")

    if ver:
        return flask.redirect(f"https://wiki.ubuntu.com/{ver}/ReleaseNotes")
    else:
        return flask.redirect(f"https://wiki.ubuntu.com/Releases")


def search_snaps():
    """
    A JSON endpoint to search the snap store API
    """

    query = flask.request.args.get("q", "")
    arch = flask.request.args.get("arch", "amd64")
    size = flask.request.args.get("size", "100")
    page = flask.request.args.get("page", "1")

    if not query:
        return flask.jsonify({"error": "Query parameter 'q' empty"}), 400

    return flask.jsonify(
        store_api.search(query, size=size, page=page, arch=arch)
    )


def advantage_view():
    accounts = None
    personal_account = None
    enterprise_contracts = []
    entitlements = {}
    openid = flask.session.get("openid")

    if auth.is_authenticated(flask.session):
        try:
            accounts = advantage.get_accounts(flask.session)
        except HTTPError as http_error:
            if http_error.response.status_code == 401:
                # We got an unauthorized request, so we likely
                # need to re-login to refresh the macaroon
                flask.current_app.extensions["sentry"].captureException(
                    extra={
                        "session_keys": flask.session.keys(),
                        "request_url": http_error.request.url,
                        "request_headers": http_error.request.headers,
                        "response_headers": http_error.response.headers,
                        "response_body": http_error.response.json(),
                        "response_code": http_error.response.json()["code"],
                        "response_message": http_error.response.json()[
                            "message"
                        ],
                    }
                )

                auth.empty_session(flask.session)

                return (
                    flask.render_template("advantage/index.html"),
                    {"Cache-Control": "private"},
                )

            raise http_error

        for account in accounts:
            account["contracts"] = advantage.get_account_contracts(
                account, flask.session
            )

            for contract in account["contracts"]:
                contract["token"] = advantage.get_contract_token(
                    contract, flask.session
                )

                machines = advantage.get_contract_machines(
                    contract, flask.session
                ).get("machines")
                contract["machineCount"] = 0

                if machines:
                    contract["machineCount"] = len(machines)

                if contract["contractInfo"].get("origin", "") == "free":
                    personal_account = account
                    personal_account["free_token"] = contract["token"]
                    for entitlement in contract["contractInfo"][
                        "resourceEntitlements"
                    ]:
                        if entitlement["type"] == "esm-infra":
                            entitlements["esm"] = True
                        elif entitlement["type"] == "livepatch":
                            entitlements["livepatch"] = True
                        elif entitlement["type"] == "fips":
                            entitlements["fips"] = True
                        elif entitlement["type"] == "cc-eal":
                            entitlements["cc-eal"] = True
                    personal_account["entitlements"] = entitlements
                else:
                    entitlements = {}
                    for entitlement in contract["contractInfo"][
                        "resourceEntitlements"
                    ]:
                        contract["supportLevel"] = "-"
                        if entitlement["type"] == "esm-infra":
                            entitlements["esm"] = True
                        elif entitlement["type"] == "livepatch":
                            entitlements["livepatch"] = True
                        elif entitlement["type"] == "fips":
                            entitlements["fips"] = True
                        elif entitlement["type"] == "cc-eal":
                            entitlements["cc-eal"] = True
                        elif entitlement["type"] == "support":
                            contract["supportLevel"] = entitlement[
                                "affordances"
                            ]["supportLevel"]
                    contract["entitlements"] = entitlements
                    contract["contractInfo"][
                        "createdAtFormatted"
                    ] = datetime.datetime.strptime(
                        contract["contractInfo"]["createdAt"],
                        "%Y-%m-%dT%H:%M:%S.%fZ",
                    ).strftime(
                        "%d %B %Y"
                    )
                    if "effectiveFrom" in contract["contractInfo"]:
                        contract["contractInfo"][
                            "effectiveFromFormatted"
                        ] = datetime.datetime.strptime(
                            contract["contractInfo"]["effectiveFrom"],
                            "%Y-%m-%dT%H:%M:%S.%fZ",
                        ).strftime(
                            "%d %B %Y"
                        )
                    enterprise_contracts.append(contract)

    return (
        flask.render_template(
            "advantage/index.html",
            openid=openid,
            accounts=accounts,
            enterprise_contracts=enterprise_contracts,
            personal_account=personal_account,
        ),
        {"Cache-Control": "private"},
    )


# Blog
# ===

blog_views = BlogViews(excluded_tags=[3184, 3265, 3408], per_page=11)
blog_blueprint = build_blueprint(blog_views)


def blog_custom_topic(slug):
    page_param = flask.request.args.get("page", default=1, type=int)
    context = blog_views.get_topic(slug, page_param)

    return flask.render_template(f"blog/topics/{slug}.html", **context)


def blog_custom_group(slug):
    page_param = flask.request.args.get("page", default=1, type=int)
    category_param = flask.request.args.get("category", default="", type=str)
    context = blog_views.get_group(slug, page_param, category_param)

    return flask.render_template(f"blog/{slug}.html", **context)


def blog_press_centre():
    page_param = flask.request.args.get("page", default=1, type=int)
    category_param = flask.request.args.get("category", default="", type=str)
    context = blog_views.get_group(
        "canonical-announcements", page_param, category_param
    )

    return flask.render_template("blog/press-centre.html", **context)
