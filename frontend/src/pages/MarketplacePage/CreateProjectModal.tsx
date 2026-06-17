import { useState, useEffect } from "react";
import { getCategories, createOrder, type Category, type OrderDetail } from "../../api/marketplace";
import "../../chat/pages/ChatsPage/modal.css";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: OrderDetail) => void;
};

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [features, setFeatures] = useState("");
  const [requirements, setRequirements] = useState("");
  const [tagNames, setTagNames] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");
      setDeliveryTime("");
      setFeatures("");
      setRequirements("");
      setTagNames("");
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !category || !price || !deliveryTime) {
      alert("Please fill in all required fields");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price");
      return;
    }

    setIsCreating(true);

    try {
      const featuresArray = features
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const tagNamesArray = tagNames
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const newOrder = await createOrder({
        title: title.trim(),
        description: description.trim(),
        category,
        price: priceNum,
        delivery_time: deliveryTime,
        features: featuresArray.length > 0 ? featuresArray : undefined,
        requirements: requirements.trim() || undefined,
        tag_names: tagNamesArray.length > 0 ? tagNamesArray : undefined,
        status: "draft",
      });

      onCreated(newOrder);
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Project</h2>
          <button className="modal-close" onClick={onClose} disabled={isCreating}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-form-group">
            <label className="modal-label" htmlFor="title">
              Project Title *
            </label>
            <input
              id="title"
              type="text"
              className="modal-input"
              placeholder="e.g., Develop CRM System for Logistics Company"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
              maxLength={255}
              required
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="description">
              Description *
            </label>
            <textarea
              id="description"
              className="modal-textarea"
              placeholder="Describe your project requirements in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={5}
              required
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="category">
              Category *
            </label>
            {loadingCategories ? (
              <div className="modal-contacts-loading">Loading categories...</div>
            ) : (
              <select
                id="category"
                className="modal-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isCreating}
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="price">
              Budget (USD) *
            </label>
            <input
              id="price"
              type="number"
              className="modal-input"
              placeholder="e.g., 2500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isCreating}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="deliveryTime">
              Delivery Time *
            </label>
            <input
              id="deliveryTime"
              type="text"
              className="modal-input"
              placeholder="e.g., 2 weeks, 1 month"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              disabled={isCreating}
              maxLength={50}
              required
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="tagNames">
              Technologies & Skills
            </label>
            <input
              id="tagNames"
              type="text"
              className="modal-input"
              placeholder="e.g., React, TypeScript, Django (comma-separated)"
              value={tagNames}
              onChange={(e) => setTagNames(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="features">
              Key Features (one per line)
            </label>
            <textarea
              id="features"
              className="modal-textarea"
              placeholder="User authentication&#10;Dashboard with analytics&#10;Real-time notifications"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              disabled={isCreating}
              rows={4}
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="requirements">
              Additional Requirements
            </label>
            <textarea
              id="requirements"
              className="modal-textarea"
              placeholder="Any specific requirements or preferences..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              disabled={isCreating}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-button modal-button--secondary"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button modal-button--primary"
              disabled={isCreating || !title.trim() || !description.trim() || !category || !price || !deliveryTime}
            >
              {isCreating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
