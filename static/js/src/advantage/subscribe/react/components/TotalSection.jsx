import React from "react";
import { Row, Col } from "@canonical/react-components";
import { formatter } from "../../renderers/form-renderer";
import { format, add } from "date-fns";
import usePreview from "../APICalls/usePreview";
import useProduct from "../APICalls/useProduct";
import { DATE_FORMAT } from "./Summary";
import { useFormikContext } from "formik";
const TotalSection = () => {
  const { product, quantity, isMonthly } = useProduct();
  const { data: preview } = usePreview();
  const { values } = useFormikContext();

  const total = formatter.format(
    preview ? preview.total / 100 : (product?.price?.value * quantity) / 100
  );

  if (isMonthly) {
    return (
      <>
        <Row className="u-no-padding u-sv1">
          <Col size="4">
            <div className="u-text-light">Monthly total:</div>
          </Col>
          <Col size="8">
            <div>
              <strong>{total}</strong>
            </div>
          </Col>
          {preview?.taxAmount ? null : (
            <Col size="8" emptyLarge="5">
              <div className="u-text-light">Excluding VAT</div>
            </Col>
          )}
        </Row>
        <Row className="u-no-padding u-sv1">
          <Col size="4">
            <div className="u-text-light">Renews on:</div>
          </Col>

          <Col size="8">
            <strong>
              {preview?.subscriptionEndOfCycle
                ? format(new Date(preview?.subscriptionEndOfCycle), DATE_FORMAT)
                : format(
                    add(new Date(), {
                      months: 1,
                    }),
                    DATE_FORMAT
                  )}
            </strong>
            <br />
            <small>
              You can control auto-renewal in your Ubuntu Advantage account at
              any time.
            </small>
          </Col>
        </Row>
      </>
    );
  }

  if (values.freeTrial === "useFreeTrial") {
    return (
      <>
        <Row className="u-no-padding u-sv1">
          <Col size="4">
            <div className="u-text-light">Total:</div>
          </Col>
          <Col size="8">
            <div>
              <strong>$0</strong>
            </div>
          </Col>
        </Row>
        <Row className="u-no-padding u-sv1">
          <Col size="4">
            <div className="u-text-light">To pay today:</div>
          </Col>
          <Col size="8">
            <div>$0 today</div>
          </Col>
        </Row>
      </>
    );
  }

  return (
    <>
      <Row className="u-no-padding u-sv1">
        <Col size="4">
          <div className="u-text-light">Total:</div>
        </Col>
        <Col size="8">
          <div>
            <strong>{total}</strong>
          </div>
        </Col>
        {preview?.taxAmount ? null : (
          <Col size="8" emptyLarge="5">
            <div className="u-text-light">Excluding VAT</div>
          </Col>
        )}
      </Row>
    </>
  );
};

export default TotalSection;
