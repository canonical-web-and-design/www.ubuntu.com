import { useQuery, useQueryClient } from "react-query";
import { checkoutEvent } from "../../../ecom-events";

const useProduct = () => {
  const buyButton = document.querySelector("#buy-now-button");
  const queryClient = useQueryClient();

  function handleProductChange() {
    queryClient.invalidateQueries("product");
  }

  //observerSet prevents us from creating a new observer on each render
  if (!window.listenersSet) {
    const observer = new MutationObserver(handleProductChange);
    observer.observe(buyButton, {
      attributes: true,
    });
    buyButton.addEventListener("click", () => {
      const product = JSON.parse(buyButton.dataset.product);
      const quantity = parseInt(buyButton.dataset.quantity);

      checkoutEvent(
        {
          id: product?.id,
          name: product?.name,
          price: product?.price?.value / 100,
          quantity: quantity,
        },
        1
      );
    });
    window.listenersSet = true;
  }
  const { data } = useQuery("product", async () => {
    return {
      product: JSON.parse(buyButton.dataset.product),
      quantity: parseInt(buyButton.dataset.quantity),
    };
  });

  return {
    product: data?.product,
    quantity: data?.quantity,
    isLoading: !data,
  };
};

export default useProduct;
