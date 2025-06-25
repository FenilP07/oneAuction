import React, { useState } from "react";
import FormInput from "../../components/FormInput";
import "./categories.css";

const AddCategory = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    is_active: true,
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    } else if (formData.name.length > 30) {
      newErrors.name = "Must be 30 characters or less";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setSuccessMessage("Category created successfully!");
      setErrorMessage("");
      setFormData({
        name: "",
        description: "",
        image: "",
        is_active: true,
      });
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(error.message);
    }
  };

  return (
 
      <div className="parent">
        <div className="title">
          <p className="add-title">Add Category</p>
        </div>

        <div className="child-overlap">
          <div className="categories-form">
            <div className="form-add">
              <form onSubmit={handleSubmit}>
                <FormInput
                  id="name"
                  name="name"
                  type="text"
                  label="Category Name:"
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                />

                <FormInput
                  id="description"
                  name="description"
                  type="text"
                  label="Description:"
                  value={formData.description}
                  onChange={handleChange}
                  error={errors.description}
                />

                <FormInput
                  id="image"
                  name="image"
                  type="text"
                  label="Image URL:"
                  value={formData.image}
                  onChange={handleChange}
                  error={errors.image}
                />

                <div className="form-check my-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="form-check-input"
                  />
                  <label htmlFor="is_active" className="form-check-label">
                    Active
                  </label>
                </div>

                {successMessage && <div className="success">{successMessage}</div>}
                {errorMessage && <div className="error">{errorMessage}</div>}

                <button type="submit" className="add-btn">
                  Add Category
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
   
  );
};

export default AddCategory;
