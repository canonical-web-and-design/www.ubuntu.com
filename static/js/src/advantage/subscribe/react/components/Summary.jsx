import React from "react";
import { Row, Col } from "@canonical/react-components";
import { add, format } from "date-fns";
import { formatter } from "../../renderers/form-renderer";
import usePreview from "../APICalls/usePreview";
import useProduct from "../APICalls/useProduct";
import { useFormikContext } from "formik";

export const DATE_FORMAT = "dd MMMM yyyy";

function Summary() {
  const { product, quantity, isMonthly } = useProduct();
  const { data: preview } = usePreview();
  const { values } = useFormikContext();

  let endDate = format(
    add(new Date(), {
      months: isMonthly ? 1 : 12,
    }),
    DATE_FORMAT
  );

  if (values.freeTrial === "useFreeTrial") {
    endDate = format(
      add(new Date(), {
        months: 1,
      }),
      DATE_FORMAT
    );
  } else if (preview?.subscriptionEndOfCycle) {
    endDate = format(new Date(preview?.subscriptionEndOfCycle), DATE_FORMAT);
  }

  let totalSection = (
    <Row className="u-no-padding u-sv1">
      <Col size="4">
        <div className="u-text-light">Subtotal:</div>
      </Col>
      <Col size="8">
        <div>{formatter.format((product?.price?.value * quantity) / 100)}</div>
      </Col>
    </Row>
  );

  if (values.freeTrial === "useFreeTrial") {
    totalSection = (
      <Row className="u-no-padding u-sv1">
        <Col size="4">
          <div className="u-text-light">Subtotal:</div>
        </Col>
        <Col size="8">
          <div>$0</div>
        </Col>
      </Row>
    );
  } else if (preview?.taxAmount) {
    totalSection = (
      <>
        {preview?.subscriptionEndOfCycle && (
          <Row className="u-no-padding u-sv1">
            <Col size="4">
              <div className="u-text-light">For this period:</div>
            </Col>
            <Col size="8">
              <div>
                {formatter.format((preview?.total - preview?.taxAmount) / 100)}
              </div>
            </Col>
          </Row>
        )}
        <Row className="u-no-padding u-sv1">
          <Col size="4">
            <div className="u-text-light">Tax:</div>
          </Col>
          <Col size="8">
            <div>{formatter.format(preview?.taxAmount / 100)}</div>
          </Col>
        </Row>
        <Row className="u-no-padding u-sv1">
          <Col size="4">
            <div className="u-text-light">Total</div>
          </Col>
          <Col size="8">
            <div>
              <b>{formatter.format(preview?.total / 100)}</b>
            </div>
          </Col>
        </Row>
      </>
    );
  } else if (preview) {
    totalSection = (
      <Row className="u-no-padding u-sv1">
        <Col size="4">
          <div className="u-text-light">
            Total
            {preview?.subscriptionEndOfCycle && " for this period"}
          </div>
        </Col>
        <Col size="8">
          <div>
            <b>{formatter.format(preview?.total / 100)}</b>
          </div>
        </Col>
      </Row>
    );
  }

  return (
    <section
      id="summary-section"
      className="p-strip is-shallow u-no-padding--top"
    >
      <Row className="u-no-padding u-sv1">
        <Col size="4">
          <div className="u-text-light">Plan type:</div>
        </Col>
        <Col size="8">
          <div dangerouslySetInnerHTML={{ __html: product?.name }} />
        </Col>
      </Row>
      <Row className="u-no-padding u-sv1">
        <Col size="4">
          <div className="u-text-light">Machines:</div>
        </Col>
        <Col size="8">
          {values.freeTrial === "useFreeTrial" ? (
            <div>{quantity} x $0</div>
          ) : (
            <div>
              {quantity} x {formatter.format(product?.price?.value / 100)}
            </div>
          )}
        </Col>
      </Row>
      <Row className="u-no-padding u-sv1">
        <Col size="4">
          <div className="u-text-light">Starts:</div>
        </Col>
        <Col size="8">
          <div>{format(new Date(), DATE_FORMAT)}</div>
        </Col>
      </Row>
      <Row className="u-no-padding u-sv1">
        <Col size="4">
          <div className="u-text-light">Ends:</div>
        </Col>

        <Col size="8">
          {endDate}
          {preview?.subscriptionEndOfCycle &&
            values.freeTrial !== "useFreeTrial" && (
              <>
                <br />
                <small>The same date as your existing subscription.</small>
              </>
            )}
        </Col>
      </Row>
      {totalSection}
    </section>
  );
}

export default Summary;
