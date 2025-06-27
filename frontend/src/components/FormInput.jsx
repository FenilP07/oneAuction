import React from "react";

const FormInput = ({ label, id, name, type = "text", value, onChange, error }) => {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label text-white">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value}
        onChange={onChange}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};

export default FormInput;
