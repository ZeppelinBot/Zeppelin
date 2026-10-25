/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type {
  ExtractBody,
  ExtractErrorResponse,
  ExtractQuery,
  ExtractQueryForGet,
  ExtractResponse,
} from "@tuyau/core/types";
import type { InferInput, SimpleError } from "@vinejs/vine/types";

export type ParamValue = string | number | bigint | boolean;

export interface Registry {
  "splash.get_index": {
    methods: ["GET", "HEAD"];
    pattern: "/";
    types: {
      body: {};
      paramsTuple: [];
      params: {};
      query: {};
      response: ExtractResponse<
        Awaited<ReturnType<import("#backend/features/splash/controllers/SplashController").default["getIndex"]>>
      >;
      errorResponse: ExtractErrorResponse<
        Awaited<ReturnType<import("#backend/features/splash/controllers/SplashController").default["getIndex"]>>
      >;
    };
  };
}
