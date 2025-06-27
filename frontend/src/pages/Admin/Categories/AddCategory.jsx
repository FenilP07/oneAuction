import React, { useState } from "react";
import FormInput from "../../../components/FormInput";
import "./categories.css";
import Layout from "../../../components/Layout";

const AddCategory = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: null, // for file upload
    is_active: true, // always true, no checkbox needed
  });

  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("is_active", formData.is_active);
      if (formData.image) {
        data.append("image", formData.image);
      }

      const response = await fetch("http://localhost:3000/api/category/create", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Something went wrong");
      }

      setSuccessMessage("Category created successfully!");
      setErrorMessage("");
      setFormData({
        name: "",
        description: "",
        image: null,
        is_active: true,
      });
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(error.message);
    }
  };

  return (
    <Layout>
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

                {/* File upload input */}
                <div className="form-group my-2">
                  <label htmlFor="image">Upload Image:</label>
                  <input
                    type="file"
                    id="image"
                    name="image"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        image: e.target.files[0],
                      }))
                    }
                    className="form-control"
                  />
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
    </Layout>
  );
};

export default AddCategory;
