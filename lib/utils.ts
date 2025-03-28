import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert prisma object into regular JS object
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Format number with decimals places
export function formatNumberWithDecimal(num: number): string {
  const [int, decimal] = num.toString().split(".");
  return decimal ? `${int}.${decimal.padEnd(2, "0")}` : `${int}.00`;
}

// Format errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function formatError(err: any) {
  if (err.name === "ZodError") {
    // Zod error
    const fieldErrors = Object.keys(err.errors).map(
      (field) => err.errors[field].message
    );

    return fieldErrors.join(". ");
  } else if (
    err.name === "PrismaClientKnownRequestError" &&
    err.code === "P2002"
  ) {
    // Prisma error
    const field = err.meta?.target ? err.meta.target[0] : "Field";
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  } else {
    // Other errors
    return typeof err.message === "string"
      ? err.message
      : JSON.stringify(err.message);
  }
}

// Round number to 2 decimal places
export function round2(value: number | string) {
  if (typeof value === "number") {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  } else if (typeof value === "string") {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  } else {
    throw new Error("Value is not a number or a string");
  }
}

const CURRENT_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
  minimumFractionDigits: 2,
});

// Format currency
export function formatCurrency(amount: number | string | null) {
  if (typeof amount === 'number') {
    return CURRENT_FORMATTER.format(amount)
  } else if (typeof amount === 'string') {
    return CURRENT_FORMATTER.format(Number(amount))
  } else {
    return 'NaN'
  }
}
