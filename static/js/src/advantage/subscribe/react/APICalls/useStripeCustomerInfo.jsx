import { useQuery } from "react-query";
import { getCustomerInfo } from "../../../contracts-api";

const useStripeCustomerInfo = () => {
  const { isLoading, isError, isSuccess, data, error } = useQuery(
    "userInfo",
    async () => {
      if (!window.accountId) {
        throw new Error("MISSING ACCOUNT_ID");
      }
      const res = await getCustomerInfo(window.accountId);

      if (res.data.code) {
        throw new Error(res.data.message);
      }
      return res.data;
    },
    {
      enabled: !!window.accountId,
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

export default useStripeCustomerInfo;
