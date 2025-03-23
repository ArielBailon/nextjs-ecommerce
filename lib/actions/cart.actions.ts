"use server";

import { CartItem } from "@/types";
import { cookies } from "next/headers";
import { convertToPlainObject, formatError, round2 } from "../utils";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { cartItemSchema, insertCartSchema } from "../validators";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export async function addItemToCart(data: CartItem) {
  try {
    const sessionCartId = await getSessionCartId();
    const userId = await getSessionUserId().catch(() => undefined);
    const cart = await getCart().catch(() => undefined);
    const item = cartItemSchema.parse(data);
    const product = await findProductById(item.productId);

    if (!cart) {
      // Create new cart object
      const newCart = insertCartSchema.parse({
        userId,
        items: [item],
        sessionCartId,
        ...calcPrice([item]),
      });

      // Add to db
      await prisma.cart.create({
        data: newCart,
      });

      // Revalidate product page
      revalidatePath(`/product/${product.slug}`);
      return { success: true, message: `${product.name} added to cart` };
    } else {
      // Check if items is already in the cart
      const existItem = (cart.items as CartItem[]).find(
        (x) => x.productId === item.productId
      );

      if (existItem) {
        // Check stock
        if (product.stock < existItem.qty + 1) {
          throw new Error("Not enough stock");
        }
        // Increase the quantity
        (cart.items as CartItem[]).find(
          (x) => x.productId === item.productId
        )!.qty = existItem.qty + 1;
      } else {
        // Item does not exist
        // Check stock
        if (product.stock < 1) throw new Error("Not enough stock");
        // Add item to cart.items
        cart.items.push(item);
      }

      // Save to db
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: cart.items as Prisma.CartUpdateitemsInput[],
          ...calcPrice(cart.items as CartItem[]),
        },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${
          existItem ? "updated in" : "added to"
        } cart`,
      };
    }
  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}

export async function getMyCart() {
  const sessionCartId = await getSessionCartId();
  const userId = await getSessionUserId();

  // Get user cart from db
  const cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionCartId },
  });

  if (!cart) return undefined;

  // Conver decimals and return
  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}

export async function removeItemFromCart(productId: string) {
  try {
    // Check for the cart cookie
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart session not found");

    const product = await prisma.product.findFirst({
      where: { id: productId },
    });
    const cart = await getMyCart();
    if (!cart) throw new Error("Cart not found");

    // Check for item
    const exist = (cart.items as CartItem[]).find(
      (x) => x.productId === productId
    );
    if (!exist) throw new Error("Item not found");

    // Check if only one in qty
    if (exist.qty === 1) {
      // Remove from cart
      cart.items = (cart.items as CartItem[]).filter(
        (x) => x.productId !== exist.productId
      );
    } else {
      // Decrease the qty
      (cart.items as CartItem[]).find((x) => x.productId === productId)!.qty =
        exist.qty - 1;
    }
    // Update cart in db
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: cart.items as Prisma.CartUpdateitemsInput[],
        ...calcPrice(cart.items as CartItem[]),
      },
    });
    revalidatePath(`/product/${product?.slug}`);

    return {
      success: true,
      message: `${product?.name} was removed fro cart`,
    };

  } catch (err) {
    return { success: false, message: formatError(err) };
  }
}

async function getSessionCartId() {
  const sessionCartId = (await cookies()).get("sessionCartId")?.value;
  if (!sessionCartId) throw new Error("Cart session not found");
  return sessionCartId;
}

// Helper function to get user ID from auth session
async function getSessionUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("User session not found");
  return session.user.id as string | undefined;
}

// Helper function to find a product by ID
async function findProductById(productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId } });
  if (!product) throw new Error("Product not found");
  return product;
}

// Helper function to get the cart (either by userId or sessionCartId)
async function getCart() {
  const sessionCartId = await getSessionCartId();
  const userId = await getSessionUserId().catch(() => undefined); // Handle guest users

  const cart = await prisma.cart.findFirst({
    where: userId ? { userId } : { sessionCartId },
  });

  if (!cart) throw new Error("Cart not found");
  return cart;
}

// Calculate cart pices
const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};
