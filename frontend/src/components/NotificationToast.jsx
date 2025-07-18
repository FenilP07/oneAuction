import React from "react";
import { Toast, ToastContainer } from "react-bootstrap";

const NotificationToast = React.memo(({ 
  show, 
  message, 
  variant, 
  onClose 
}) => {
  return (
    <ToastContainer position="top-end" className="p-3">
      <Toast 
        bg={variant} 
        show={show} 
        onClose={onClose} 
        delay={3000} 
        autohide 
        className="fade show"
      >
        <Toast.Header>
          <strong className="me-auto">{variant.toUpperCase()}</strong>
        </Toast.Header>
        <Toast.Body>{message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
});

NotificationToast.displayName = "NotificationToast";
export default NotificationToast;