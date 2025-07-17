import { useState } from "react";

export const useNotification = () => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("info");

  const showNotification = (message, variant = "info") => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const hideNotification = () => {
    setShowToast(false);
  };

  return {
    showToast,
    toastMessage,
    toastVariant,
    showNotification,
    hideNotification,
  };
};