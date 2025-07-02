import React, { useState } from "react";
import "./categories.css";

const EditCategoryModal = ({ category, onClose, onUpdated }) => {
  const [formData, setFormData] = useState({
    name: category.name || "",
    description: category.description || "",
    image: null,
    is_active: category.is_active ?? true,
  });

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("is_active", formData.is_active);
    if (formData.image) {
      data.append("image", formData.image);
    }

    const response = await fetch(`http://localhost:3000/api/category/${category._id}`, {
      method: "PUT",
      body: data,
    });

    const result = await response.json();
    if (response.ok) {
      onUpdated();
    } else {
      alert(result.message || "Update failed");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <h3>Edit Category</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Category Name"
          />
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Description"
          />

          {category.image && (
            <div className="image-preview">
              <p>Current Image:</p>
              <img
                src={`http://localhost:3000/${category.image.replace(/\\/g, "/")}`}
                alt="Current"
                style={{ width: "100px", height: "100px", objectFit: "cover" }}
              />
            </div>
          )}

          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                image: e.target.files[0],
              }))
            }
          />

   <label style={{ marginTop: "10px", display: "block" }}>
  <input
    type="checkbox"
    name="is_active"
    checked={formData.is_active}
    onChange={handleChange}
  />
  {formData.is_active ? " Active" : " Inactive"}
</label>



          <div className="modal-actions" style={{ marginTop: "15px" }}>
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCategoryModal;
