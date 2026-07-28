import * as common from "./sections/common";
import * as nav from "./sections/nav";
import * as settings from "./sections/settings";
import * as auth from "./sections/auth";
import * as adminCatalog from "./sections/adminCatalog";
import * as adminOps from "./sections/adminOps";
import * as sales from "./sections/sales";
import * as reports from "./sections/reports";

export type Language = "en" | "sw";

const en = {
  common: common.en,
  nav: nav.en,
  settings: settings.en,
  auth: auth.en,
  adminCatalog: adminCatalog.en,
  adminOps: adminOps.en,
  sales: sales.en,
  reports: reports.en,
};

const sw = {
  common: common.sw,
  nav: nav.sw,
  settings: settings.sw,
  auth: auth.sw,
  adminCatalog: adminCatalog.sw,
  adminOps: adminOps.sw,
  sales: sales.sw,
  reports: reports.sw,
};

export type Dictionary = typeof en;

export function getDictionary(language: Language): Dictionary {
  return language === "sw" ? sw : en;
}
