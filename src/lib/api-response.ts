import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function serializeForApi(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeForApi(item));
  }

  if (data instanceof Uint8Array) {
    return Buffer.from(data).toString("base64");
  }

  const obj = data as Record<string, unknown> & { constructor?: { name?: string } };

  const ctorName = obj.constructor?.name;
  if (ctorName === "Date") {
    return (data as Date).toISOString();
  }

  if (ctorName === "BigInt") {
    return (data as unknown as bigint).toString();
  }

  if (
    (typeof (data as any).toFixed === "function" &&
      typeof (data as any).toNumber === "function" &&
      Array.isArray((data as any).d)) ||
    ctorName === "Decimal"
  ) {
    const decimal = data as any;
    if (typeof decimal.toNumber === "function") return decimal.toNumber();
    if (typeof decimal.toString === "function") return Number(decimal.toString());
    return Number(decimal);
  }

  if (typeof (data as any).toJSON === "function") {
    try {
      return serializeForApi((data as any).toJSON());
    } catch {
      // continue
    }
  }

  if (
    ctorName === "Object" ||
    ctorName === undefined ||
    Object.getPrototypeOf(data) === null
  ) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeForApi(value);
    }
    return result;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = serializeForApi(value);
  }
  return result;
}

export function apiJson<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(serializeForApi(body) as any, init);
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data: serializeForApi(data) }, { status });
}

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export function toDecimal(val: string | number | Prisma.Decimal): Prisma.Decimal {
  if (val instanceof Prisma.Decimal) return val;
  return new Prisma.Decimal(String(val));
}

export function decimalToNumber(val: Prisma.Decimal | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  return val.toNumber();
}
