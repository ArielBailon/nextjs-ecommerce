import { auth } from "@/auth";
import { getMyCart } from "@/lib/actions/cart.actions";
import { getUserById } from "@/lib/actions/user.actions";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ShippingAddress } from "@/types";
import ShippingAddressForm from "./shipping-address-form";
import CheckoutSteps from "@/components/shared/checkout";

export const metadata: Metadata = {
  title: "Shipping Address",
};

const ShippingAddress = async () => {
  const cart = await getMyCart();
  console.log(cart);

  if (!cart || cart.items.length === 0) redirect("/cart");

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("No user ID");
  const user = await getUserById(userId);

  return (
    <>
      <CheckoutSteps current={1}></CheckoutSteps>
      <ShippingAddressForm
        address={user.address as ShippingAddress}
      ></ShippingAddressForm>
    </>
  );
};

export default ShippingAddress;
