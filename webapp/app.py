"""
A Flask application for ubuntu.com
"""

# Packages
import os
import talisker.requests
import flask
from canonicalwebteam.flask_base.app import FlaskBase
from canonicalwebteam.templatefinder import TemplateFinder
from canonicalwebteam.search import build_search_view
from canonicalwebteam import image_template
from canonicalwebteam.blog import build_blueprint, BlogViews, BlogAPI
from canonicalwebteam.discourse import (
    DiscourseAPI,
    Docs,
    DocParser,
    EngageParser,
    EngagePages,
    Tutorials,
    TutorialParser,
)

# Local
from webapp.advantage.api import (
    UAContractsAPIAuthError,
    UAContractsAPIError,
    UAContractsAPIErrorView,
    UAContractsAPIAuthErrorView,
)
from webapp.context import (
    current_year,
    descending_years,
    format_date,
    get_json_feed,
    modify_query,
    month_name,
    months_list,
    get_navigation,
    releases,
)

from webapp.advantage.parser import UAContractsValidationError
from webapp.cube.views import (
    cube_home,
    cube_microcerts,
    cube_study_labs_button,
    is_authorized,
)

from webapp.views import (
    BlogCustomGroup,
    BlogCustomTopic,
    BlogPressCentre,
    BlogSitemapIndex,
    BlogSitemapPage,
    build,
    build_tutorials_index,
    download_server_steps,
    download_thank_you,
    appliance_install,
    appliance_portfolio,
    post_build,
    releasenotes_redirect,
    search_snaps,
    show_template,
    notify_build,
    build_engage_index,
    engage_thank_you,
    sitemap_index,
    account_query,
    sixteen_zero_four,
)

from webapp.advantage.views import (
    accept_renewal,
    advantage_view,
    advantage_shop_view,
    payment_methods_view,
    advantage_thanks_view,
    ensure_purchase_account,
    get_customer_info,
    get_purchase,
    get_renewal,
    post_advantage_subscriptions,
    post_anonymised_customer_info,
    post_payment_method,
    post_auto_renewal_settings,
    post_customer_info,
    post_stripe_invoice_id,
    cancel_advantage_subscriptions,
)

from webapp.login import login_handler, logout, user_info, empty_session
from webapp.security.database import db_session
from webapp.security.views import (
    create_notice,
    delete_notice,
    create_release,
    delete_release,
    notice,
    read_notice,
    read_notices,
    notices,
    notices_feed,
    update_notice,
    cve_index,
    cve,
    delete_cve,
    bulk_upsert_cve,
    single_notices_sitemap,
    notices_sitemap,
    single_cves_sitemap,
    cves_sitemap,
)

from webapp.certified.views import (
    certified_home,
    certified_model_details,
    certified_hardware_details,
    certified_component_details,
)


CAPTCHA_TESTING_API_KEY = os.getenv(
    "CAPTCHA_TESTING_API_KEY", "6LfYBloUAAAAAINm0KzbEv6TP0boLsTEzpdrB8if"
)

# Set up application
# ===

app = FlaskBase(
    __name__,
    "ubuntu.com",
    template_folder="../templates",
    template_404="404.html",
    template_500="500.html",
    static_folder="../static",
)

# Settings
app.config["CONTRACTS_LIVE_API_URL"] = os.getenv(
    "CONTRACTS_LIVE_API_URL", "https://contracts.canonical.com"
).rstrip("/")
app.config["CONTRACTS_TEST_API_URL"] = os.getenv(
    "CONTRACTS_TEST_API_URL", "https://contracts.staging.canonical.com"
).rstrip("/")
app.config["CANONICAL_LOGIN_URL"] = os.getenv(
    "CANONICAL_LOGIN_URL", "https://login.ubuntu.com"
)
session = talisker.requests.get_session()
discourse_api = DiscourseAPI(
    base_url="https://discourse.ubuntu.com/", session=session
)


# Error pages
@app.errorhandler(400)
def bad_request_error(error):
    return flask.render_template("400.html"), 400


@app.errorhandler(UAContractsValidationError)
def ua_contracts_validation_error(error):
    return flask.jsonify({"errors": str(error)}), 422


@app.errorhandler(UAContractsAPIError)
def ua_contracts_api_error(error):
    flask.current_app.extensions["sentry"].captureException(
        extra={
            "session_keys": flask.session.keys(),
            "request_url": error.request.url,
            "request_headers": error.request.headers,
            "response_headers": error.response.headers,
            "response_body": error.response.json(),
            "response_code": error.response.json()["code"],
            "response_message": error.response.json()["message"],
        }
    )

    return (
        flask.jsonify({"errors": error.response.json()["message"]}),
        error.response.status_code or 500,
    )


@app.errorhandler(UAContractsAPIErrorView)
def ua_contracts_api_error_view(error):
    flask.current_app.extensions["sentry"].captureException(
        extra={
            "session_keys": flask.session.keys(),
            "request_url": error.request.url,
            "request_headers": error.request.headers,
            "response_headers": error.response.headers,
            "response_body": error.response.json(),
            "response_code": error.response.json()["code"],
            "response_message": error.response.json()["message"],
        }
    )

    return flask.render_template("500.html"), 500


@app.errorhandler(UAContractsAPIAuthError)
def ua_contracts_api_authentication_error(error):
    flask.current_app.extensions["sentry"].captureException(
        extra={
            "session_keys": flask.session.keys(),
            "request_url": error.request.url,
            "request_headers": error.request.headers,
            "response_headers": error.response.headers,
            "response_body": error.response.json(),
            "response_code": error.response.json()["code"],
            "response_message": error.response.json()["message"],
        }
    )

    empty_session(flask.session)

    return flask.jsonify({"errors": error.response.json()["message"]}), 401


@app.errorhandler(UAContractsAPIAuthErrorView)
def ua_contracts_api_authentication_error_view(error):
    flask.current_app.extensions["sentry"].captureException(
        extra={
            "session_keys": flask.session.keys(),
            "request_url": error.request.url,
            "request_headers": error.request.headers,
            "response_headers": error.response.headers,
            "response_body": error.response.json(),
            "response_code": error.response.json()["code"],
            "response_message": error.response.json()["message"],
        }
    )

    empty_session(flask.session)

    return flask.redirect(flask.request.url)


@app.errorhandler(410)
def deleted_error(error):
    return flask.render_template("410.html"), 410


# Template context
@app.context_processor
def context():
    return {
        "current_year": current_year,
        "descending_years": descending_years,
        "format_date": format_date,
        "get_json_feed": get_json_feed,
        "modify_query": modify_query,
        "month_name": month_name,
        "months_list": months_list,
        "get_navigation": get_navigation,
        "product": flask.request.args.get("product", ""),
        "request": flask.request,
        "releases": releases(),
        "user_info": user_info(flask.session),
        "utm_campaign": flask.request.args.get("utm_campaign", ""),
        "utm_medium": flask.request.args.get("utm_medium", ""),
        "utm_source": flask.request.args.get("utm_source", ""),
        "CAPTCHA_TESTING_API_KEY": CAPTCHA_TESTING_API_KEY,
        "http_host": flask.request.host,
    }


@app.context_processor
def utility_processor():
    return {"image": image_template}


# Routes
# ===

# Simple routes
app.add_url_rule("/sitemap.xml", view_func=sitemap_index)
app.add_url_rule("/account.json", view_func=account_query)
app.add_url_rule("/advantage", view_func=advantage_view)
app.add_url_rule("/advantage/subscribe", view_func=advantage_shop_view)
app.add_url_rule("/account/payment-methods", view_func=payment_methods_view)
app.add_url_rule(
    "/advantage/subscribe/thank-you", view_func=advantage_thanks_view
)
app.add_url_rule(
    "/advantage/subscribe",
    view_func=post_advantage_subscriptions,
    methods=["POST"],
    defaults={"preview": False},
)
app.add_url_rule(
    "/advantage/subscribe",
    view_func=cancel_advantage_subscriptions,
    methods=["DELETE"],
)
app.add_url_rule(
    "/advantage/subscribe/preview",
    view_func=post_advantage_subscriptions,
    methods=["POST"],
    defaults={"preview": True},
)
app.add_url_rule(
    "/advantage/customer-info", view_func=post_customer_info, methods=["POST"]
)
app.add_url_rule(
    "/advantage/customer-info-anon",
    view_func=post_anonymised_customer_info,
    methods=["POST"],
)
app.add_url_rule(
    "/advantage/payment-method",
    view_func=post_payment_method,
    methods=["POST"],
)
app.add_url_rule(
    "/advantage/set-auto-renewal",
    view_func=post_auto_renewal_settings,
    methods=["POST"],
)
app.add_url_rule(
    "/advantage/<tx_type>/<tx_id>/invoices/<invoice_id>",
    view_func=post_stripe_invoice_id,
    methods=["POST"],
)
app.add_url_rule(
    "/advantage/purchases/<purchase_id>",
    view_func=get_purchase,
    methods=["GET"],
)
app.add_url_rule(
    "/advantage/purchase-account",
    view_func=ensure_purchase_account,
    methods=["POST"],
)
app.add_url_rule(
    "/advantage/renewals/<renewal_id>", view_func=get_renewal, methods=["GET"]
)

app.add_url_rule(
    "/advantage/customer-info/<account_id>",
    view_func=get_customer_info,
    methods=["GET"],
)

app.add_url_rule(
    "/advantage/renewals/<renewal_id>/process-payment",
    view_func=accept_renewal,
    methods=["POST"],
)

app.add_url_rule(
    (
        "/download"
        "/<regex('server|desktop|cloud|raspberry-pi'):category>"
        "/thank-you"
    ),
    view_func=download_thank_you,
)

app.add_url_rule(
    "/download/server",
    methods=["GET", "POST"],
    view_func=download_server_steps,
)

app.add_url_rule("/getubuntu/releasenotes", view_func=releasenotes_redirect)
app.add_url_rule(
    "/search",
    "search",
    build_search_view(session=session, template_path="search.html"),
)
app.add_url_rule(
    (
        "/appliance/<regex('[a-z-]+'):appliance>/"
        "<regex('(raspberry-pi2?|intel-nuc|vm)'):device>"
    ),
    view_func=appliance_install,
)
app.add_url_rule(
    "/appliance/portfolio",
    view_func=appliance_portfolio,
)

# blog section

blog_views = BlogViews(
    api=BlogAPI(session=session),
    excluded_tags=[3184, 3265, 3408, 3960],
    per_page=11,
)
app.add_url_rule(
    "/blog/topics/<regex('maas|design|juju|robotics|snapcraft'):slug>",
    view_func=BlogCustomTopic.as_view("blog_topic", blog_views=blog_views),
)
app.add_url_rule(
    "/blog/<regex('cloud-and-server|desktop|internet-of-things'):slug>",
    view_func=BlogCustomGroup.as_view("blog_group", blog_views=blog_views),
)
app.add_url_rule(
    "/blog/press-centre",
    view_func=BlogPressCentre.as_view("press_centre", blog_views=blog_views),
)
app.add_url_rule(
    "/blog/sitemap.xml",
    view_func=BlogSitemapIndex.as_view("sitemap", blog_views=blog_views),
)
app.add_url_rule(
    "/blog/sitemap/<regex('.+'):slug>.xml",
    view_func=BlogSitemapPage.as_view("sitemap_page", blog_views=blog_views),
)
app.register_blueprint(build_blueprint(blog_views), url_prefix="/blog")

# usn section
app.add_url_rule(
    "/security/api/notices/<notice_id>",
    view_func=read_notice,
)
app.add_url_rule(
    "/security/api/notices",
    view_func=read_notices,
)
app.add_url_rule("/security/notices", view_func=notices)
app.add_url_rule(
    "/security/notices", view_func=create_notice, methods=["POST"]
)

app.add_url_rule("/security/notices/<notice_id>", view_func=notice)
app.add_url_rule(
    "/security/notices/<notice_id>", view_func=update_notice, methods=["PUT"]
)
app.add_url_rule(
    "/security/notices/<notice_id>",
    view_func=delete_notice,
    methods=["DELETE"],
)

app.add_url_rule("/security/notices/<feed_type>.xml", view_func=notices_feed)

app.add_url_rule(
    "/security/notices/sitemap-<regex('[0-9]*'):offset>.xml",
    view_func=single_notices_sitemap,
)

app.add_url_rule("/security/notices/sitemap.xml", view_func=notices_sitemap)

app.add_url_rule(
    "/security/cve/sitemap-<regex('[0-9]*'):offset>.xml",
    view_func=single_cves_sitemap,
)

app.add_url_rule("/security/cve/sitemap.xml", view_func=cves_sitemap)

app.add_url_rule(
    "/security/releases", view_func=create_release, methods=["POST"]
)
app.add_url_rule(
    "/security/releases/<codename>",
    view_func=delete_release,
    methods=["DELETE"],
)

# cve section
app.add_url_rule("/security/cve", view_func=cve_index)
app.add_url_rule("/security/cve", view_func=bulk_upsert_cve, methods=["PUT"])

app.add_url_rule(
    r"/security/<regex('(cve-|CVE-)\d{4}-\d{4,7}'):cve_id>", view_func=cve
)
app.add_url_rule(
    r"/security/<regex('(cve-|CVE-)\d{4}-\d{4,7}'):cve_id>",
    view_func=delete_cve,
    methods=["DELETE"],
)

# Login
app.add_url_rule("/login", methods=["GET", "POST"], view_func=login_handler)
app.add_url_rule("/logout", view_func=logout)

# Engage pages and takeovers from Discourse
# This section needs to provide takeover data for /

engage_path = "/engage"
engage_pages = EngagePages(
    parser=EngageParser(
        api=DiscourseAPI(
            base_url="https://discourse.ubuntu.com/",
            session=session,
        ),
        index_topic_id=18033,
        url_prefix=engage_path,
    ),
    document_template="/engage/base.html",
    url_prefix=engage_path,
    blueprint_name="engage-pages",
)

app.add_url_rule(engage_path, view_func=build_engage_index(engage_pages))


def get_takeovers():
    takeovers = {}

    engage_pages.parser.parse()
    takeovers["sorted"] = sorted(
        engage_pages.parser.takeovers,
        key=lambda takeover: takeover["publish_date"],
        reverse=True,
    )
    takeovers["active"] = [
        takeover
        for takeover in engage_pages.parser.takeovers
        if takeover["active"] == "true"
    ]

    return takeovers


def takeovers_json():
    takeovers = get_takeovers()
    response = flask.jsonify(takeovers["active"])
    response.cache_control.max_age = "300"

    return response


def takeovers_index():
    takeovers = get_takeovers()

    return flask.render_template(
        "takeovers/index.html",
        takeovers=takeovers,
    )


app.add_url_rule("/16-04", view_func=sixteen_zero_four)
app.add_url_rule("/takeovers.json", view_func=takeovers_json)
app.add_url_rule("/takeovers", view_func=takeovers_index)
engage_pages.init_app(app)

# All other routes
template_finder_view = TemplateFinder.as_view("template_finder")
template_finder_view._exclude_xframe_options_header = True
app.add_url_rule("/", view_func=template_finder_view)
app.add_url_rule("/snaps", view_func=search_snaps)
app.add_url_rule("/core/build", view_func=build)
app.add_url_rule("/core/build", view_func=post_build, methods=["POST"])
app.add_url_rule(
    "/core/build/notify", view_func=notify_build, methods=["POST"]
)
app.add_url_rule("/<path:subpath>", view_func=template_finder_view)

url_prefix = "/server/docs"
server_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=11322,
        url_prefix=url_prefix,
    ),
    document_template="/server/docs/document.html",
    url_prefix=url_prefix,
)

# Server docs search
app.add_url_rule(
    "/server/docs/search",
    "server-docs-search",
    build_search_view(
        session=session,
        site="ubuntu.com/server/docs",
        template_path="/server/docs/search-results.html",
    ),
)

server_docs.init_app(app)

# Allow templates to be queried from discourse.ubuntu.com
app.add_url_rule(
    "/templates/<filename>",
    "templates",
    view_func=show_template,
)

tutorials_path = "/tutorials"
tutorials_docs = Tutorials(
    parser=TutorialParser(
        api=discourse_api,
        category_id=34,
        index_topic_id=13611,
        url_prefix=tutorials_path,
    ),
    document_template="/tutorials/tutorial.html",
    url_prefix=tutorials_path,
    blueprint_name="tutorials",
)
app.add_url_rule(
    tutorials_path, view_func=build_tutorials_index(session, tutorials_docs)
)
tutorials_docs.init_app(app)

# Ceph docs
ceph_docs = Docs(
    parser=DocParser(
        api=discourse_api, index_topic_id=17250, url_prefix="/ceph/docs"
    ),
    document_template="/ceph/docs/document.html",
    url_prefix="/ceph/docs",
    blueprint_name="ceph",
)
ceph_docs.init_app(app)

# Ceph docs search
app.add_url_rule(
    "/ceph/docs/search",
    "ceph-docs-search",
    build_search_view(
        session=session,
        site="ubuntu.com/ceph/docs",
        template_path="ceph/docs/search-results.html",
    ),
)

app.add_url_rule(
    "/engage/<page>/thank-you",
    defaults={"language": None},
    view_func=engage_thank_you(engage_pages),
)
app.add_url_rule(
    "/engage/<language>/<page>/thank-you",
    endpoint="alternative_thank-you",
    view_func=engage_thank_you(engage_pages),
)

# Core docs
core_docs = Docs(
    parser=DocParser(
        api=discourse_api, index_topic_id=19764, url_prefix="/core/docs"
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs",
    blueprint_name="core",
)
# Core docs search
app.add_url_rule(
    "/core/docs/search",
    "core-docs-search",
    build_search_view(
        session=session,
        site="ubuntu.com/core/docs",
        template_path="/core/docs/search-results.html",
    ),
)
core_docs.init_app(app)

# Core docs - Modem Manager
core_modem_manager_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=19901,
        url_prefix="/core/docs/modem-manager",
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs/modem-manager",
    blueprint_name="modem-manager",
)
core_modem_manager_docs.init_app(app)

# Core docs - Bluetooth (bluez) docs
core_bluetooth_docs = Docs(
    parser=DocParser(
        api=discourse_api, index_topic_id=19971, url_prefix="/core/docs/bluez"
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs/bluez",
    blueprint_name="bluez",
)
core_bluetooth_docs.init_app(app)

# Core docs - NetworkManager
core_network_manager_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=19917,
        url_prefix="/core/docs/networkmanager",
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs/networkmanager",
    blueprint_name="networkmanager",
)
core_network_manager_docs.init_app(app)

# Core docs - wp-supplicant
core_wpa_supplicant_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=19943,
        url_prefix="/core/docs/wpa-supplicant",
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs/wpa-supplicant",
    blueprint_name="wpa-supplicant",
)
core_wpa_supplicant_docs.init_app(app)

# Core docs - easy-openvpn
core_easy_openvpn_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=19950,
        url_prefix="/core/docs/easy-openvpn",
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs/easy-openvpn",
    blueprint_name="easy-openvpn",
)
core_easy_openvpn_docs.init_app(app)

# Core docs - wifi-ap
core_wifi_ap_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=19959,
        url_prefix="/core/docs/wifi-ap",
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs/wifi-ap",
    blueprint_name="wifi-ap",
)
core_wifi_ap_docs.init_app(app)

# Core docs - alsa-utils
core_als_autils_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=19995,
        url_prefix="/core/docs/alsa-utils",
    ),
    document_template="/core/docs/document.html",
    url_prefix="/core/docs/alsa-utils",
    blueprint_name="alsa-utils",
)
core_als_autils_docs.init_app(app)

# Cube docs
app.add_url_rule("/cube", view_func=cube_home)
app.add_url_rule("/cube/microcerts", view_func=cube_microcerts)
app.add_url_rule("/cube/study/labs", view_func=cube_study_labs_button)

# Charmed OpenStack docs
openstack_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=20991,
        url_prefix="/openstack/docs",
    ),
    document_template="openstack/docs/document.html",
    url_prefix="/openstack/docs",
    blueprint_name="openstack-docs",
)

# Charmed OpenStack docs search
app.add_url_rule(
    "/openstack/docs/search",
    "openstack-docs-search",
    build_search_view(
        session=session,
        site="ubuntu.com/openstack/docs",
        template_path="openstack/docs/search-results.html",
    ),
)

openstack_docs.init_app(app)

# Security Certifications docs
security_certs_docs = Docs(
    parser=DocParser(
        api=discourse_api,
        index_topic_id=22810,
        url_prefix="/security/certifications/docs",
    ),
    document_template="/security/certifications/docs/document.html",
    url_prefix="/security/certifications/docs",
    blueprint_name="security-certs-docs",
)

# Security Certifications search
app.add_url_rule(
    "/security/certifications/docs/search",
    "security-certs-docs-search",
    build_search_view(
        session=session,
        site="ubuntu.com/security/certifications/docs",
        template_path="/security/certifications/docs/search-results.html",
    ),
)

security_certs_docs.init_app(app)

app.add_url_rule("/certified", view_func=certified_home)
app.add_url_rule(
    "/certified/<canonical_id>",
    view_func=certified_model_details,
)
app.add_url_rule(
    "/certified/<canonical_id>/<release>",
    view_func=certified_hardware_details,
)
app.add_url_rule(
    "/certified/component/<component_id>",
    view_func=certified_component_details,
)


@app.before_request
def cube_require_login_cube_study():
    if flask.request.path.startswith("/cube/study"):
        user = user_info(flask.session)
        if not user:
            return flask.redirect("/login?next=" + flask.request.path)

        if not is_authorized(user):
            flask.abort(403)


@app.after_request
def cache_headers(response):
    """
    Set cache expiry to 60 seconds for homepage and blog page
    """

    disable_cache_on = ("/advantage", "/cube", "/core/build", "/account.json")

    if flask.request.path.startswith(disable_cache_on):
        response.cache_control.no_store = True

    return response


@app.teardown_appcontext
def remove_db_session(response):
    db_session.remove()
    return response
