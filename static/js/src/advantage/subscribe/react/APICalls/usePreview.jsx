import { useQuery } from "react-query";
import { postPurchasePreviewData } from "../../../contracts-api";
import useProduct from "./useProduct";
import useStripeCustomerInfo from "./useStripeCustomerInfo";

const usePreview = () => {
  const { product, quantity } = useProduct();
  const { isError: isUserInfoError } = useStripeCustomerInfo();

  const { isLoading, isError, isSuccess, data, error } = useQuery(
    ["preview", product],
    async () => {
      const res = await postPurchasePreviewData(
        window.accountId,
        [
          {
            name: product.name,
            period: product.period,
            price: product.price.value,
            product_listing_id: product.id,
            quantity: quantity,
          },
        ],
        window.previousPurchaseIds?.[product.period]
      );

      if (res.errors) {
        throw new Error(res.errors);
      }
      return res;
    },
    {
      enabled: !!window.accountId && !!product && !isUserInfoError,
    }
  );

  return {
    isLoading: isLoading,
    isError: isError,
    isSuccess: isSuccess,
    data: data,
    error: error,
  };
};

export default usePreview;
