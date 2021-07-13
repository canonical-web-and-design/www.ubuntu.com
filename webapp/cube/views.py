import copy
import os
import flask
import talisker.requests
import talisker.sentry
import yaml

from pathlib import Path
from urllib.parse import quote_plus

from requests import Session

from webapp.cube.api import BadgrAPI, EdxAPI
from webapp.decorators import login_required
from webapp.login import user_info


CUBE_CONTENT = yaml.load(
    Path("webapp/cube/content/cube.yaml").read_text(), Loader=yaml.Loader
)

AUTHORIZED_USERS = (
    os.getenv("CUBE_AUTHORIZED_USERS").strip(" ,").split(",")
    if os.getenv("CUBE_AUTHORIZED_USERS")
    else []
)

badgr_session = Session()
talisker.requests.configure(badgr_session),
badgr_api = BadgrAPI(
    os.getenv("BADGR_URL"),
    os.getenv("BAGDR_USER"),
    os.getenv("BADGR_PASSWORD"),
    badgr_session,
)

# This API lives under a sub-domain of ubuntu.com but requests to it
# still need proxying, so we configure the session manually to avoid
# it loading the configurations from environment variables, since those
# default to not proxy requests for ubuntu.com sub-domains and that is
# the intended behaviour for most of our apps
proxies = {"http": os.getenv("HTTP_PROXY"), "https": os.getenv("HTTPS_PROXY")}
edx_session = Session()
edx_session.proxies.update(proxies)
talisker.requests.configure(edx_session)

edx_api = EdxAPI(
    os.getenv("CUBE_EDX_URL"),
    os.getenv("CUBE_EDX_CLIENT_ID"),
    os.getenv("CUBE_EDX_CLIENT_SECRET"),
    edx_session,
)


def is_authorized(user):
    email_domain = user["email"].split("@")[1]
    return (
        email_domain.lower() == "canonical.com"
        or user["email"].lower() in AUTHORIZED_USERS
    )


@login_required
def cube_microcerts():
    assertions = {}
    enrollments = []
    passed_courses = 0

    sso_user = user_info(flask.session)
    if not is_authorized(sso_user):
        flask.abort(403)

    edx_url = (
        f"{edx_api.base_url}/auth/login/tpa-saml/"
        "?auth_entry=login&idp=ubuntuone&next="
    )

    edx_user = edx_api.get_user(sso_user["email"]) if sso_user else None
    if edx_user:
        assertions = {
            assertion["badgeclass"]: assertion
            for assertion in badgr_api.get_assertions(
                CUBE_CONTENT["badgr-issuer"], edx_user["email"]
            )["result"]
        }

        enrollments = [
            enrollment["course_details"]["course_id"]
            for enrollment in edx_api.get_enrollments(edx_user["username"])
            if enrollment["is_active"]
        ]

    certified_badge = {}
    if CUBE_CONTENT["certified-badge"] in assertions:
        assertion = assertions.pop(CUBE_CONTENT["certified-badge"])
        if not assertion["revoked"]:
            certified_badge["image"] = assertion["image"]
            certified_badge["share_url"] = assertion["openBadgeId"]

    study_labs = CUBE_CONTENT["study-labs"]
    courses = copy.deepcopy(CUBE_CONTENT["courses"])
    for course in courses:
        attempts = []

        if edx_user:
            attempts = edx_api.get_course_attempts(
                course["id"], edx_user["username"]
            )["proctored_exam_attempts"]

        assertion = assertions.get(course["badge"]["class"])
        course["status"] = "not-enrolled"
        if assertion and not assertion["revoked"]:
            course["badge"]["url"] = assertion["image"]
            course["status"] = "passed"
            passed_courses += 1
        elif attempts:
            course["status"] = (
                "in-progress" if not attempts[0]["completed_at"] else "failed"
            )
        elif course["id"] in enrollments:
            course["status"] = "enrolled"

        course_id = course["id"]
        courseware_name = course_id.split("+")[1]

        course["take_url"] = edx_url + quote_plus(
            f"/courses/{course_id}/courseware/2020/start/?child=first"
        )

        course["study_lab"] = edx_url + quote_plus(
            f"/courses/{study_labs}/courseware/{courseware_name}/?child=first"
        )

    study_labs_url = edx_url + quote_plus(f"/courses/{study_labs}/course/")

    return flask.render_template(
        "cube/microcerts.html",
        **{
            "edx_user": edx_user,
            "edx_register_url": f"{edx_url}%2F",
            "sso_user": sso_user,
            "certified_badge": certified_badge,
            "modules": courses,
            "passed_courses": passed_courses,
            "has_enrollments": len(enrollments) > 0,
            "has_study_labs": study_labs in enrollments,
            "study_labs_url": study_labs_url,
        },
    )


@login_required
def cube_home():
    sso_user = user_info(flask.session)
    if not is_authorized(sso_user):
        flask.abort(403)

    return flask.render_template("cube/index.html")


@login_required
def cube_study_labs_button():
    sso_user = user_info(flask.session)
    if not is_authorized(sso_user):
        return flask.jsonify({}), 403

    edx_user = edx_api.get_user(sso_user["email"])
    enrollments = [
        enrollment["course_details"]["course_id"]
        for enrollment in edx_api.get_enrollments(edx_user["username"])
        if enrollment["is_active"]
    ]

    text = "Purchase study labs access"
    redirect_url = "/cube/microcerts"

    if CUBE_CONTENT["prepare-course"] in enrollments:
        text = "Access study labs"
        prepare_materials_path = quote_plus(
            f"/courses/{CUBE_CONTENT['prepare-course']}/course/"
        )
        redirect_url = (
            f"{edx_api.base_url}/auth/login/tpa-saml/"
            f"?auth_entry=login&idp=ubuntuone&next={prepare_materials_path}"
        )

    return flask.jsonify({"text": text, "redirect_url": redirect_url})
