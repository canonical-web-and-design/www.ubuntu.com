# Standard library
import hashlib
import hmac
import json
import math
import os
import re

# Packages
import dateutil
import feedparser
import flask
import gnupg
import talisker.requests
import yaml
import jinja2
from ubuntu_release_info.data import Data
from canonicalwebteam.store_api.stores.snapstore import SnapStore
from canonicalwebteam.launchpad import Launchpad
from geolite2 import geolite2
from requests import Session
from requests.exceptions import HTTPError
from canonicalwebteam.search.models import get_search_results
from canonicalwebteam.search.views import NoAPIKeyError


# Local
from webapp.login import user_info
from webapp.marketo import MarketoAPI


ip_reader = geolite2.reader()
session = talisker.requests.get_session()
store_api = SnapStore(session=talisker.requests.get_session())

marketo_session = Session()
talisker.requests.configure(marketo_session)
marketo_api = MarketoAPI(
    "https://066-EOV-335.mktorest.com",
    os.getenv("MARKETO_API_CLIENT"),
    os.getenv("MARKETO_API_SECRET"),
    marketo_session,
)


def _build_mirror_list():
    # Build mirror list
    mirrors = []
    mirror_list = []

    try:
        with open(f"{os.getcwd()}/etc/ubuntu-mirrors-rss.xml") as rss:
            mirrors = feedparser.parse(rss.read()).entries
    except IOError:
        pass

    country_code = "NO_COUNTRY_CODE"
    ip_location = ip_reader.get(
        flask.request.headers.get("X-Real-IP", flask.request.remote_addr)
    )

    if ip_location and "country" in ip_location:
        country_code = ip_location["country"]["iso_code"]

        for mirror in mirrors:
            if mirror["mirror_countrycode"] == country_code and mirror[
                "link"
            ].startswith("https"):
                mirror_list.append(
                    {
                        "link": mirror["link"],
                        "bandwidth": mirror["mirror_bandwidth"],
                    }
                )

    return mirror_list


def sixteen_zero_four():
    host = "https://ubuntu.com"
    total_notices_issued = "-"
    total_cves_issued = "-"
    latest_notices = []

    try:
        response = session.request(
            method="GET",
            url=f"{host}/security/notices.json?release=xenial&limit=1",
        )

        total_notices_issued = response.json().get("total_results")
    except HTTPError:
        flask.current_app.extensions["sentry"].captureException()

    try:
        response = session.request(
            method="GET",
            url=(
                f"{host}/security/cves.json"
                f"?version=xenial&status=released&limit=1"
            ),
        )

        total_cves_issued = response.json().get("total_results")
    except HTTPError:
        flask.current_app.extensions["sentry"].captureException()

    try:
        response = session.request(
            method="GET",
            url=f"{host}/security/notices.json?release=xenial&limit=5",
        )

        latest_notices = [
            {
                "id": notice.get("id"),
                "title": notice.get("title"),
                "date": dateutil.parser.parse(
                    notice.get("published")
                ).strftime("%d %B %Y"),
                "summary": notice.get("summary"),
            }
            for notice in response.json().get("notices")
        ]
    except HTTPError:
        flask.current_app.extensions["sentry"].captureException()

    context = {
        "total_patches_applied": 69,  # hard-coded for now
        "total_notices_issued": f"{total_notices_issued:,}",
        "total_cves_issued": f"{total_cves_issued:,}",
        "latest_notices": latest_notices,
    }

    return flask.render_template("16-04/index.html", **context)


def show_template(filename):
    try:
        template_content = flask.render_template(f"templates/{filename}.html")
    except jinja2.exceptions.TemplateNotFound:
        flask.abort(404)

    return (
        template_content,
        {"Access-Control-Allow-Origin": "*"},
    )


def download_server_steps():
    templates = {
        "step1": "download/server/step1.html",
        "step2": "download/server/step2.html",
        "choose": "download/server/choose.html",
        "download": "download/server/download.html",
    }
    context = {}
    step = flask.request.form.get("next-step") or "step1"

    if step not in templates:
        flask.abort(400)

    if step == "download":
        version = flask.request.form.get("version")

        if not version:
            flask.abort(400)

        context = {"version": version, "mirror_list": _build_mirror_list()}

    return flask.render_template(templates[step], **context)


def download_thank_you(category):
    version = flask.request.args.get("version", "")
    architecture = flask.request.args.get("architecture", "").replace(" ", "+")

    if version and not architecture:
        flask.abort(400)

    return (
        flask.render_template(
            f"download/{category}/thank-you.html",
            version=version,
            architecture=architecture,
            mirror_list=_build_mirror_list(),
        ),
        {"Cache-Control": "no-cache"},
    )


def appliance_install(appliance, device):
    with open("appliances.yaml") as appliances:
        appliances = yaml.load(appliances, Loader=yaml.FullLoader)

    return flask.render_template(
        f"appliance/{appliance}/{device}.html",
        http_host=flask.request.host,
        appliance=appliances["appliances"][appliance],
    )


def appliance_portfolio():
    with open("appliances.yaml") as appliances:
        appliances = yaml.load(appliances, Loader=yaml.FullLoader)

    return flask.render_template(
        "appliance/portfolio.html",
        http_host=flask.request.host,
        appliances=appliances["appliances"],
    )


def releasenotes_redirect():
    """
    View to redirect to https://wiki.ubuntu.com/ URLs for release notes.

    This used to be done in the Apache frontend, but that is going away
    to be replace by the content-cache.

    Old apache redirects: https://pastebin.canonical.com/p/3TXyyNkWkg/
    """

    version = flask.request.args.get("ver", "")[:5]

    for codename, release in Data().releases.items():
        short_version = ".".join(release.version.split(".")[:2])
        if version == short_version:
            release_slug = release.full_codename.replace(" ", "")

            return flask.redirect(
                f"https://wiki.ubuntu.com/{release_slug}/ReleaseNotes"
            )

    return flask.redirect("https://wiki.ubuntu.com/Releases")


def build():
    """
    Show build page
    """

    return flask.render_template(
        "core/build/index.html",
        board_architectures=json.dumps(Launchpad.board_architectures),
    )


def post_build():
    """
    Once they submit the build form on /core/build,
    kick off the build with Launchpad
    """

    opt_in = flask.request.values.get("canonicalUpdatesOptIn")
    full_name = flask.request.values.get("fullName")
    names = full_name.split(" ")
    email = flask.request.values.get("email")
    board = flask.request.values.get("board")
    system = flask.request.values.get("system")
    snaps = flask.request.values.get("snaps", "").split(",")
    arch = flask.request.values.get("arch")

    if not user_info(flask.session):
        flask.abort(401)

    launchpad = Launchpad(
        username=os.environ["LAUNCHPAD_IMAGE_BUILD_USER"],
        token=os.environ["LAUNCHPAD_IMAGE_BUILD_TOKEN"],
        secret=os.environ["LAUNCHPAD_IMAGE_BUILD_SECRET"],
        session=session,
        auth_consumer=os.environ["LAUNCHPAD_IMAGE_BUILD_AUTH_CONSUMER"],
    )

    context = {}

    # Submit user to marketo
    marketo_api.submit_form(
        {
            "formId": "3546",
            "input": [
                {
                    "leadFormFields": {
                        "canonicalUpdatesOptIn": opt_in,
                        "firstName": " ".join(names[:-1]),
                        "lastName": names[-1] if len(names) > 1 else "",
                        "email": email,
                        "formid": "3546",
                        "imageBuilderStatus": "NULL",
                    }
                }
            ],
        }
    )

    # Ensure webhook is created
    if flask.request.host == "ubuntu.com":
        launchpad.create_update_system_build_webhook(
            system=system,
            delivery_url="https://ubuntu.com/core/build/notify",
            secret=flask.current_app.config["SECRET_KEY"],
        )

    # Kick off image build
    try:
        response = launchpad.build_image(
            board=board,
            system=system,
            snaps=snaps,
            author_info={"name": full_name, "email": email, "board": board},
            gpg_passphrase=flask.current_app.config["SECRET_KEY"],
            arch=arch,
        )
        context["build_info"] = launchpad.session.get(
            response.headers["Location"]
        ).json()
    except HTTPError as http_error:
        if http_error.response.status_code == 400:
            return (
                flask.render_template(
                    "core/build/error.html",
                    build_error=http_error.response.content.decode(),
                ),
                400,
            )
        else:
            raise http_error

    return flask.render_template("core/build/index.html", **context)


def notify_build():
    """
    An endpoint to trigger an update about a build event to be sent.
    This will usually be triggered by a webhook from Launchpad
    """

    # Verify contents
    signature = hmac.new(
        flask.current_app.config["SECRET_KEY"].encode("utf-8"),
        flask.request.data,
        hashlib.sha1,
    ).hexdigest()

    if "X-Hub-Signature" not in flask.request.headers:
        return "No X-Hub-Signature provided\n", 403

    if not hmac.compare_digest(
        signature, flask.request.headers["X-Hub-Signature"].split("=")[1]
    ):
        try:
            raise HTTPError(400)
        except HTTPError:
            flask.current_app.extensions["sentry"].captureException(
                extra={
                    "request_headers": str(flask.request.headers.keys()),
                    "message": "x-hub-signature did not match",
                    "expected_signature": signature,
                    "header_contents": flask.request.headers[
                        "X-Hub-Signature"
                    ],
                    "extracted_signature": flask.request.headers[
                        "X-Hub-Signature"
                    ].split("=")[1],
                }
            )

        return "X-Hub-Signature does not match\n", 400

    event_content = flask.request.json
    status = event_content["status"]
    build_url = (
        "https://api.launchpad.net/devel" + event_content["livefs_build"]
    )

    launchpad = Launchpad(
        username=os.environ["LAUNCHPAD_IMAGE_BUILD_USER"],
        token=os.environ["LAUNCHPAD_IMAGE_BUILD_TOKEN"],
        secret=os.environ["LAUNCHPAD_IMAGE_BUILD_SECRET"],
        session=session,
        auth_consumer=os.environ["LAUNCHPAD_IMAGE_BUILD_AUTH_CONSUMER"],
    )

    build = launchpad.request(build_url).json()
    author_json = (
        gnupg.GPG()
        .decrypt(
            build["metadata_override"]["_author_data"],
            passphrase=flask.current_app.config["SECRET_KEY"],
        )
        .data
    )

    if author_json:
        author = json.loads(author_json)
    else:
        return "_author_data could not be decoded\n", 400

    email = author["email"]
    names = author["name"].split(" ")
    board = author["board"]
    snaps = ", ".join(build["metadata_override"]["extra_snaps"])
    codename = build["distro_series_link"].split("/")[-1]
    version = Data().by_codename(codename).version
    arch = build["distro_arch_series_link"].split("/")[-1]
    build_link = build["web_link"]
    build_id = build_link.split("/")[-1]

    download_url = None

    if status == "Successfully built":
        download_url = launchpad.request(
            f"{build_url}?ws.op=getFileUrls"
        ).json()[0]

    marketo_api.submit_form(
        {
            "formId": "3546",
            "input": [
                {
                    "leadFormFields": {
                        "firstName": " ".join(names[:-1]),
                        "lastName": names[-1] if len(names) > 1 else "",
                        "email": email,
                        "formid": "3546",
                        "imageBuilderVersion": version,
                        "imageBuilderArchitecture": arch,
                        "imageBuilderBoard": board,
                        "imageBuilderSnaps": snaps,
                        "imageBuilderID": build_id,
                        "imageBuilderBuildlink": build_link,
                        "imageBuilderStatus": status,
                        "imageBuilderDownloadlink": download_url,
                    }
                }
            ],
        }
    )

    return "Submitted\n", 202


def search_snaps():
    """
    A JSON endpoint to search the snap store API
    """

    query = flask.request.args.get("q", "")
    architecture = flask.request.args.get("architecture", "wide")
    board = flask.request.args.get("board")
    system = flask.request.args.get("system")
    size = flask.request.args.get("size", "100")
    page = flask.request.args.get("page", "1")

    if board and system:
        architecture = Launchpad.board_architectures[board][system]["arch"]

    if not query:
        return flask.jsonify({"error": "Query parameter 'q' empty"}), 400

    search_response = store_api.search(
        query, size=size, page=page, arch=architecture
    )

    return flask.jsonify(
        {
            "results": search_response.get("results", {}),
            "architecture": architecture,
        }
    )


def account_query():
    """
    A JSON endpoint to request login status
    """

    return flask.jsonify(
        {
            "account": user_info(flask.session),
        }
    )


def build_tutorials_index(session, tutorials_docs):
    def tutorials_index():
        page = flask.request.args.get("page", default=1, type=int)
        topic = flask.request.args.get("topic", default=None, type=str)
        sort = flask.request.args.get("sort", default=None, type=str)
        query = flask.request.args.get("q", default=None, type=str)
        posts_per_page = 15

        """
        Get search results from Google Custom Search
        """

        # The webteam's default custom search ID
        search_engine_id = "009048213575199080868:i3zoqdwqk8o"

        # API key should always be provided as an environment variable
        search_api_key = os.getenv("SEARCH_API_KEY")

        if query and not search_api_key:
            raise NoAPIKeyError("Unable to search: No API key provided")

        results = None

        if query:
            results = get_search_results(
                session=session,
                api_key=search_api_key,
                search_engine_id=search_engine_id,
                siteSearch="ubuntu.com/tutorials",
                query=query,
            )

        tutorials_docs.parser.parse()
        if not topic:
            metadata = tutorials_docs.parser.metadata
        else:
            metadata = [
                doc
                for doc in tutorials_docs.parser.metadata
                if topic in doc["categories"]
            ]

        if query:
            temp_metadata = []
            if results.get("entries"):
                for result in results["entries"]:
                    start = result["link"].find("tutorials/")
                    end = len(result["link"])
                    identifier = result["link"][start:end]
                    if start != -1:
                        for doc in metadata:
                            if identifier in doc["topic"]:
                                temp_metadata.append(doc)
            metadata = temp_metadata

        if sort == "difficulty-desc":
            metadata = sorted(
                metadata, key=lambda k: k["difficulty"], reverse=True
            )

        if sort == "difficulty-asc" or not sort:
            metadata = sorted(
                metadata, key=lambda k: k["difficulty"], reverse=False
            )

        total_results = len(metadata)
        total_pages = math.ceil(total_results / posts_per_page)

        return flask.render_template(
            "tutorials/index.html",
            navigation=tutorials_docs.parser.navigation,
            forum_url=tutorials_docs.parser.api.base_url,
            metadata=metadata,
            page=page,
            topic=topic,
            sort=sort,
            query=query,
            posts_per_page=posts_per_page,
            total_results=total_results,
            total_pages=total_pages,
        )

    return tutorials_index


def build_engage_index(engage_docs):
    def engage_index():
        page = flask.request.args.get("page", default=1, type=int)
        topic = flask.request.args.get("topic", default=None, type=str)
        sort = flask.request.args.get("sort", default=None, type=str)
        preview = flask.request.args.get("preview")
        posts_per_page = 15
        engage_docs.parser.parse()
        metadata = engage_docs.parser.metadata

        if preview is None:
            metadata = [
                item
                for item in metadata
                if "active" in item and item["active"] == "true"
            ]

        total_pages = math.ceil(len(metadata) / posts_per_page)

        return flask.render_template(
            "engage/index.html",
            forum_url=engage_docs.parser.api.base_url,
            metadata=metadata,
            page=page,
            topic=topic,
            sort=sort,
            preview=preview,
            posts_per_page=posts_per_page,
            total_pages=total_pages,
        )

    return engage_index


def engage_thank_you(engage_pages):
    """
    Renders an engage pages thank-you page
    i.e. whitepapers, pdfs

    If there is no current topic it can't render the page
    e.g. accessing directly

    @parameters: language (optional) and page path name
    e.g. /cloud-init-whitepaper
    @returns: a function that renders a template
    """

    def render_template(language, page):
        engage_pages.parser.parse()
        page_url = f"/engage/{page}"
        if language:
            page_url = f"/engage/{language}/{page}"
        index_topic_data = next(
            (x for x in engage_pages.parser.metadata if x["path"] == page_url),
            None,
        )

        if index_topic_data:
            topic_id = engage_pages.parser.url_map[page_url]
            engage_page_data = engage_pages.parser.get_topic(topic_id)
            request_url = flask.request.referrer
            resource_name = index_topic_data["type"]
            resource_url = engage_page_data["metadata"]["resource_url"]
            language = index_topic_data["language"]
            # Filter related engage pages by language
            related = [
                item
                for item in engage_page_data["related"]
                if item["language"] == language
            ]
            template_language = "engage/thank-you.html"
            if language and language != "en":
                template_language = f"engage/shared/_{language}_thank-you.html"

            return flask.render_template(
                template_language,
                request_url=request_url,
                resource_name=resource_name,
                resource_url=resource_url,
                related=related,
            )
        else:
            return flask.abort(404)

    return render_template


# Blog
# ===
class BlogView(flask.views.View):
    def __init__(self, blog_views):
        self.blog_views = blog_views


class BlogCustomTopic(BlogView):
    def dispatch_request(self, slug):
        page_param = flask.request.args.get("page", default=1, type=int)
        context = self.blog_views.get_topic(slug, page_param)

        return flask.render_template(f"blog/topics/{slug}.html", **context)


class BlogCustomGroup(BlogView):
    def dispatch_request(self, slug):
        page_param = flask.request.args.get("page", default=1, type=int)
        category_param = flask.request.args.get(
            "category", default="", type=str
        )
        context = self.blog_views.get_group(slug, page_param, category_param)

        return flask.render_template(f"blog/{slug}.html", **context)


class BlogPressCentre(BlogView):
    def dispatch_request(self):
        page_param = flask.request.args.get("page", default=1, type=int)
        category_param = flask.request.args.get(
            "category", default="", type=str
        )
        context = self.blog_views.get_group(
            "canonical-announcements", page_param, category_param
        )

        return flask.render_template("blog/press-centre.html", **context)


class BlogSitemapIndex(BlogView):
    def dispatch_request(self):
        response = session.get(
            "https://admin.insights.ubuntu.com/sitemap_index.xml"
        )

        xml = response.text.replace(
            "https://admin.insights.ubuntu.com/",
            "https://ubuntu.com/blog/sitemap/",
        )
        xml = re.sub(r"<\?xml-stylesheet.*\?>", "", xml)

        response = flask.make_response(xml)
        response.headers["Content-Type"] = "application/xml"
        return response


class BlogSitemapPage(BlogView):
    def dispatch_request(self, slug):
        response = session.get(f"https://admin.insights.ubuntu.com/{slug}.xml")

        if response.status_code == 404:
            return flask.abort(404)

        xml = response.text.replace(
            "https://admin.insights.ubuntu.com/", "https://ubuntu.com/blog/"
        )
        xml = re.sub(r"<\?xml-stylesheet.*\?>", "", xml)

        response = flask.make_response(xml)
        response.headers["Content-Type"] = "application/xml"
        return response


def sitemap_index():
    xml_sitemap = flask.render_template("sitemap_index.xml")
    response = flask.make_response(xml_sitemap)

    response.headers["Content-Type"] = "application/xml"
    return response


def marketo_submit():
    form_fields = {}
    for key, value in flask.request.form.items():
        if value:
            form_fields[key] = value

    form_fields.pop("thankyoumessage", None)
    form_fields.pop("g-recaptcha-response", None)
    return_url = form_fields.pop("returnURL", None)

    payload = {
        "formId": form_fields.pop("formid"),
        "input": [{"leadFormFields": form_fields}],
    }

    try:
        response = marketo_api.submit_form(payload)
        data = response.json()
        if data["result"][0]["status"] == "skipped":
            flask.current_app.extensions["sentry"].captureMessage(
                f"Markerto form {payload['formId']} failed to submit",
                extra={"payload": payload, "response": data},
            )
    except Exception:
        flask.current_app.extensions["sentry"].captureException(
            extra={"payload": payload}
        )

        return (
            flask.jsonify(
                {"error": "There was an issue submitting the form."}
            ),
            400,
        )

    if return_url:
        return flask.redirect(return_url)

    return flask.jsonify({"message": "Form submitted."})
