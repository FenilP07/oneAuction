import React, { useState, useEffect } from "react";
import useAuthStore from "../../store/authStore";
import  {getAllCategories} from "../../services/categoryService";
import  {createItem}  from "../../services/itemService";
import { Upload, X, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';



const ItemListingPage = () => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    starting_bid: "",
    category_id: "",
  });

  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const categories = await getAllCategories({ activeOnly: true });
      setCategories(categories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setErrors({
        general: "Failed to load categories. Please refresh the page.",
      });
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    if (images.length + files.length > 10) {
      setErrors((prev) => ({
        ...prev,
        images: "Maximum 10 images allowed",
      }));
      return;
    }

    const validFiles = files.filter((file) => {
      const isValid =
        file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024;
      if (!isValid) {
        setErrors((prev) => ({
          ...prev,
          images: "Only image files under 5MB are allowed",
        }));
      }
      return isValid;
    });

    const newImages = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
    }));

    setImages((prev) => [...prev, ...newImages]);
    setErrors((prev) => ({ ...prev, images: "" }));
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      // Cleanup object URL
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return updated;
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Item name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Item name must be at least 3 characters";
    }

    if (!formData.starting_bid) {
      newErrors.starting_bid = "Starting bid is required";
    } else if (
      isNaN(formData.starting_bid) ||
      parseFloat(formData.starting_bid) <= 0
    ) {
      newErrors.starting_bid = "Starting bid must be a positive number";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Please select a category";
    }

    if (images.length === 0) {
      newErrors.images = "At least one image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const imageFiles = images.map((image) => image.file);
      const response = await createItem(formData, imageFiles);
      console.log("Created item:", response);

      setSuccess(true);

      // Reset form
      setFormData({
        name: "",
        description: "",
        starting_bid: "",
        category_id: "",
      });

      // Cleanup image previews
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error creating item:", error);
      setErrors({
        general: error.message || "Failed to create item. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };
   if (!user) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8 text-center p-4">
            <AlertCircle className="text-secondary mb-3" size={48} />
            <h3 className="mb-2">Authentication Required</h3>
            <p className="text-muted">Please log in to create an item.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5">
      <div className="card">
        <div className="card-body">
          <div className="mb-4">
            <h2 className="card-title">Create New Item</h2>
            <p className="text-muted">
              Add a new item to the auction. Your item will be reviewed before going live.
            </p>
          </div>

          {success && (
            <div className="alert alert-success mb-4">
              <div className="d-flex align-items-center">
                <CheckCircle className="me-2" size={20} />
                <span>Item created successfully! It's now pending approval.</span>
              </div>
            </div>
          )}

          {errors.general && (
            <div className="alert alert-danger mb-4">
              <div className="d-flex align-items-center">
                <AlertCircle className="me-2" size={20} />
                <span>{errors.general}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Item Name */}
            <div className="mb-3">
              <label htmlFor="name" className="form-label">Item Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                placeholder="Enter item name"
                maxLength={100}
              />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>

            {/* Description */}
            <div className="mb-3">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="form-control"
                placeholder="Describe your item..."
                maxLength={1000}
              />
              <div className="form-text">{formData.description.length}/1000 characters</div>
            </div>

            {/* Starting Bid */}
            <div className="mb-3">
              <label htmlFor="starting_bid" className="form-label">Starting Bid ($) *</label>
              <input
                type="number"
                id="starting_bid"
                name="starting_bid"
                value={formData.starting_bid}
                onChange={handleInputChange}
                min="0.01"
                step="0.01"
                className={`form-control ${errors.starting_bid ? 'is-invalid' : ''}`}
                placeholder="0.00"
              />
              {errors.starting_bid && <div className="invalid-feedback">{errors.starting_bid}</div>}
            </div>

            {/* Category */}
            <div className="mb-3">
              <label htmlFor="category_id" className="form-label">Category *</label>
              {categoriesLoading ? (
                <div className="d-flex align-items-center justify-content-center p-3">
                  <div className="spinner-border spinner-border-sm text-secondary me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <span className="text-muted">Loading categories...</span>
                </div>
              ) : (
                <>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className={`form-select ${errors.category_id ? 'is-invalid' : ''}`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <div className="invalid-feedback">{errors.category_id}</div>}
                </>
              )}
            </div>

            {/* Images */}
            <div className="mb-4">
              <label className="form-label">Images * (Max 10 images, 5MB each)</label>
              
              {/* Upload Area */}
              <div
                className={`border border-2 border-dashed rounded p-4 text-center mb-2 ${
                  dragActive
                    ? 'border-primary bg-primary bg-opacity-10'
                    : errors.images
                    ? 'border-danger bg-danger bg-opacity-10'
                    : 'border-secondary'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="text-muted mb-3" size={48} />
                <p className="text-muted mb-2">
                  Drag and drop images here, or{' '}
                  <label htmlFor="images" className="text-primary cursor-pointer">
                    browse
                  </label>
                </p>
                <p className="text-muted small">PNG, JPG, JPEG up to 5MB</p>
                <input
                  type="file"
                  id="images"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="d-none"
                />
              </div>

              {errors.images && <div className="text-danger small">{errors.images}</div>}

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="row mt-3 g-2">
                  {images.map((image, index) => (
                    <div key={image.id} className="col-6 col-md-4 col-lg-3 position-relative">
                      <img
                        src={image.preview}
                        alt={`Preview ${index + 1}`}
                        className="img-thumbnail w-100"
                        style={{ height: '100px', objectFit: 'cover' }}
                      />
                      {index === 0 && (
                        <span className="position-absolute top-0 start-0 badge bg-primary">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="position-absolute top-0 end-0 btn btn-sm btn-danger p-0 rounded-circle"
                        style={{ width: '24px', height: '24px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end pt-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating Item...
                  </>
                ) : (
                  <>
                    <Plus size={18} className="me-2" />
                    Create Item
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );}

export default ItemListingPage;
