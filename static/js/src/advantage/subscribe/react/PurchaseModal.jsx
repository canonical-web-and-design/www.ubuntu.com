import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  ActionButton,
  CheckboxInput,
  Notification,
  Spinner,
} from "@canonical/react-components";
import useStripeCustomerInfo from "./APICalls/useStripeCustomerInfo";
import registerPaymentMethod from "./APICalls/registerPaymentMethod";
import PaymentMethodSummary from "./components/PaymentMethodSummary";
import PaymentMethodForm from "./components/PaymentMethodForm";
import Summary from "./components/Summary";
import { Formik } from "formik";
import useProduct from "./APICalls/useProduct";
import usePurchase from "./APICalls/usePurchase";
import usePendingPurchase from "./APICalls/usePendingPurchase";
import { useQueryClient } from "react-query";
import { getErrorMessage } from "../../error-handler";
import usePreview from "./APICalls/usePreview";
import { checkoutEvent, purchaseEvent } from "../../ecom-events";
import { getSessionData } from "../../../utils/getSessionData";

const getUserInfoFromVariables = (data, variables) => {
  return {
    customerInfo: {
      email: variables.email,
      name: variables.name,
      address: {
        line1: variables.address,
        postal_code: variables.postalCode,
        country: variables.country,
        city: variables.city,
        state:
          variables.country === "US" ? variables.usState : variables.caProvince,
      },
      defaultPaymentMethod: {
        brand: data.paymentMethod.brand,
        last4: data.paymentMethod.last4,
        expMonth: data.paymentMethod.exp_month,
        expYear: data.paymentMethod.exp_year,
      },
      taxID: { value: variables.VATNumber.value },
    },
    accountInfo: {
      name: variables.organisationName,
    },
  };
};

const PurchaseModal = () => {
  const [error, setError] = useState(null);
  const [areTermsChecked, setTermsChecked] = useState(false);
  const [isCardValid, setCardValid] = useState(false);
  const {
    data: userInfo,
    isLoading: isUserInfoLoading,
  } = useStripeCustomerInfo();
  const { isLoading: isPreviewLoading } = usePreview();
  const { isLoading: isProductLoading, product, quantity } = useProduct();
  const [step, setStep] = useState(
    userInfo?.customerInfo?.defaultPaymentMethod ? 2 : 1
  );
  const queryClient = useQueryClient();

  const {
    data: pendingPurchase,
    setPendingPurchaseID,
    error: purchaseError,
    isLoading: isPendingPurchaseLoading,
  } = usePendingPurchase();

  const paymentMethodMutation = registerPaymentMethod();
  const purchaseMutation = usePurchase();

  const initialValues = {
    email: userInfo?.customerInfo?.email ?? "",
    name: userInfo?.customerInfo?.name ?? "",
    buyingFor:
      !window.accountId || userInfo?.accountInfo?.name
        ? "organisation"
        : "myself",
    organisationName: userInfo?.accountInfo?.name ?? "",
    address: userInfo?.customerInfo?.address?.line1 ?? "",
    postalCode: userInfo?.customerInfo?.address?.postal_code ?? "",
    country: userInfo?.customerInfo?.address?.country ?? "",
    city: userInfo?.customerInfo?.address?.city ?? "",
    usState: userInfo?.customerInfo?.address?.state ?? "",
    caProvince: userInfo?.customerInfo?.address?.state ?? "",
    VATNumber: userInfo?.customerInfo?.taxID?.value ?? "",
  };

  useEffect(() => {
    if (userInfo?.customerInfo?.defaultPaymentMethod) {
      setStep(2);
    }
  }, [userInfo]);

  const GAFriendlyProduct = {
    id: product?.id,
    name: product?.name,
    price: product?.price?.value / 100,
    quantity: quantity,
  };

  useEffect(() => {
    // the initial call was successful but it returned an error while polling the purchase status
    if (purchaseError) {
      if (
        purchaseError.message.includes(
          "We are unable to authenticate your payment method"
        )
      ) {
        setError(
          <>
            We were unable to verify your credit card. Check the details and try
            again. Contact{" "}
            <a href="https://ubuntu.com/contact-us">Canonical sales</a> if the
            problem persists.
          </>
        );
      } else {
        setError(
          <>
            We were unable to process the payment. Check the details and try
            again. Contact{" "}
            <a href="https://ubuntu.com/contact-us">Canonical sales</a> if the
            problem persists.
          </>
        );
      }
      setStep(1);
    }
  }, [purchaseError]);

  useEffect(() => {
    if (pendingPurchase?.status === "done") {
      const purchaseInfo = {
        id: pendingPurchase?.id,
        origin: "UA Shop",
        total: pendingPurchase?.invoice?.total / 100,
        tax: pendingPurchase?.invoice?.taxAmount / 100,
      };

      purchaseEvent(purchaseInfo, GAFriendlyProduct);

      // The state of the product selector is stored in the local storage
      // if a purchase is successful we empty it so the customer will see
      // the default values pre-selected instead of what they just bought.
      localStorage.removeItem("ua-subscribe-state");

      let request = new XMLHttpRequest();
      let formData = new FormData();
      formData.append("munchkinId", "066-EOV-335");
      formData.append("formid", 3756);
      formData.append("formVid", 3756);
      formData.append("Email", userInfo?.customerInfo?.email);
      formData.append("Consent_to_Processing__c", "yes");
      formData.append("GCLID__c", getSessionData("gclid"));
      formData.append("utm_campaign", getSessionData("utm_campaign"));
      formData.append("utm_source", getSessionData("utm_source"));
      formData.append("utm_medium", getSessionData("utm_medium"));

      request.open(
        "POST",
        "https://app-sjg.marketo.com/index.php/leadCapture/save2"
      );
      request.send(formData);

      request.onreadystatechange = () => {
        if (request.readyState === 4) {
          //redirect
          if (window.isGuest) {
            location.href = `/advantage/subscribe/thank-you?email=${encodeURIComponent(
              pendingPurchase?.invoice?.customerEmail
            )}`;
          } else {
            location.pathname = "/advantage";
          }
        }
      };
    }
  }, [pendingPurchase]);

  const onSubmit = (values, actions) => {
    setError(null);
    checkoutEvent(GAFriendlyProduct, 2);
    paymentMethodMutation.mutate(values, {
      onSuccess: (data, variables) => {
        window.accountId = data.accountId;
        setTermsChecked(false);
        setStep(2);
        queryClient.setQueryData(
          "userInfo",
          getUserInfoFromVariables(data, variables)
        );
        queryClient.invalidateQueries("preview");

        actions.setSubmitting(false);
      },
      onError: (error) => {
        if (error.message === "email_already_exists") {
          setError(
            <>
              An Ubuntu One account with this email address exists. Please{" "}
              <a href="/login">sign in</a> to your account first.
            </>
          );
        } else {
          // Tries to match the error with a known error code and defaults to a generic error if it fails
          setError(
            getErrorMessage({ message: "", code: error.message }) ?? (
              <>
                Sorry, there was an unknown error with your credit card. Check
                the details and try again. Contact{" "}
                <a href="https://ubuntu.com/contact-us">Canonical sales</a> if
                the problem persists.
              </>
            )
          );
        }

        actions.setSubmitting(false);
      },
    });
  };

  const onPayClick = () => {
    checkoutEvent(GAFriendlyProduct, 3);
    purchaseMutation.mutate("", {
      onSuccess: (data) => {
        //start polling
        setPendingPurchaseID(data);
      },
      onError: (error) => {
        if (error.message.includes("can only make one purchase at a time")) {
          setError(
            <>
              You already have a pending purchase. Please go to{" "}
              <a href="/account/payment-methods">payment methods</a> to retry.
            </>
          );
        } else {
          setError(
            <>
              Sorry, there was an unknown error with with the payment. Check the
              details and try again. Contact{" "}
              <a href="https://ubuntu.com/contact-us">Canonical sales</a> if the
              problem persists.
            </>
          );
        }
      },
    });
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={true}
      onSubmit={onSubmit}
    >
      {({ isValid, dirty, submitForm, isSubmitting }) => (
        <>
          <header className="p-modal__header">
            <h2 className="p-modal__title u-no-margin--bottom" id="modal-title">
              Complete purchase {status}
            </h2>
          </header>
          <div id="modal-description" className="p-modal__body">
            {isUserInfoLoading || isProductLoading || isPreviewLoading ? (
              <Col
                size="12"
                className="u-align--center"
                style={{ padding: "10rem 0" }}
              >
                <Spinner />
              </Col>
            ) : (
              <>
                <Summary />
                {error && (
                  <Notification type="negative" status="Error:">
                    {error}
                  </Notification>
                )}
                {step === 1 ? (
                  <PaymentMethodForm setCardValid={setCardValid} />
                ) : (
                  <PaymentMethodSummary setStep={setStep} />
                )}
                {step === 1 ? null : (
                  <Row className="u-no-padding">
                    <Col size="12">
                      <CheckboxInput
                        name="TermsCheckbox"
                        onChange={(e) => {
                          setTermsChecked(e.target.checked);
                        }}
                        label={
                          <>
                            I agree to the{" "}
                            <a
                              href="/legal/ubuntu-advantage-service-terms"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Ubuntu Advantage service terms
                            </a>
                          </>
                        }
                      />
                    </Col>
                  </Row>
                )}
              </>
            )}
          </div>
          <footer className="p-modal__footer">
            <Row className="u-no-padding">
              <ActionButton
                className="js-cancel-modal col-small-2 col-medium-2 col-start-medium-3 col-start-large-7 col-3 u-no-margin"
                appearance="neutral"
                aria-controls="purchase-modal"
                style={{ textAlign: "center" }}
              >
                Cancel
              </ActionButton>

              {step === 1 ? (
                <ActionButton
                  disabled={(!userInfo && !dirty) || !isValid || !isCardValid}
                  appearance="positive"
                  className="col-small-2 col-medium-2 col-3 u-no-margin"
                  style={{ textAlign: "center" }}
                  onClick={submitForm}
                  loading={isSubmitting}
                >
                  Continue
                </ActionButton>
              ) : (
                <ActionButton
                  className="col-small-2 col-medium-2 col-3 u-no-margin"
                  appearance="positive"
                  style={{ textAlign: "center" }}
                  disabled={!areTermsChecked}
                  onClick={onPayClick}
                  loading={
                    purchaseMutation.isLoading || isPendingPurchaseLoading
                  }
                >
                  Pay
                </ActionButton>
              )}
            </Row>
          </footer>
        </>
      )}
    </Formik>
  );
};

export default PurchaseModal;
