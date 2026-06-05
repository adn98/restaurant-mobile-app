import { Alert } from "react-native";

import { useOrderStore } from "@/store/orderStore";
import { useSettingsStore } from "@/store/settingsStore";
import { generateInvoiceHTML } from "@/utils/invoiceTemplate";
import { Invoice } from "@/types";

export function useInvoice(orderId?: string) {
  const invoices = useOrderStore((state) => state.invoices);
  const settings = useSettingsStore((state) => state.settings);
  const invoice = invoices.find((item) => item.orderId === orderId) ?? invoices.find((item) => item.id === orderId);

  function previewPrint(targetInvoice: Invoice) {
    generateInvoiceHTML(targetInvoice, settings);
    Alert.alert("Print ready", "Thermal receipt HTML was generated for the MVP print flow.");
  }

  return {
    invoice,
    invoices,
    settings,
    previewPrint,
  };
}
