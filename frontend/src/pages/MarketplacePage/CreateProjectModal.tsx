import { useState, useEffect } from "react";
import { getCategories, createOrder, type Category, type OrderDetail } from "../../api/marketplace";
import "./create-job-modal.css";

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
  const [estimatedDays, setEstimatedDays] = useState("");
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
      setEstimatedDays("");
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

    if (!title.trim() || !description.trim() || !category || !price || !estimatedDays) {
      alert("Please fill in all required fields");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Please enter a valid price");
      return;
    }

    const daysNum = parseInt(estimatedDays, 10);
    if (isNaN(daysNum) || daysNum <= 0) {
      alert("Please enter a valid number of days");
      return;
    }

    setIsCreating(true);

    try {
      const tagNamesArray = tagNames
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const newOrder = await createOrder({
        title: title.trim(),
        description: description.trim(),
        category,
        price: priceNum,
        estimated_days: daysNum,
        tag_names: tagNamesArray.length > 0 ? tagNamesArray : undefined,
        status: "open",
      });

      onCreated(newOrder);
    } catch (error) {
      console.error("Failed to create job:", error);
      alert("Failed to create job. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cjm-overlay" onClick={onClose}>
      <div className="cjm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cjm-header">
          <span className="cjm-title">Post a Job</span>
          <button className="cjm-close" onClick={onClose} disabled={isCreating}>
            ×
          </button>
        </div>

        <form className="cjm-body" onSubmit={handleSubmit}>
          <div className="cjm-field">
            <label className="cjm-label" htmlFor="cjm-title">
              Title <span className="cjm-required">*</span>
            </label>
            <input
              id="cjm-title"
              type="text"
              className="cjm-input"
              placeholder="e.g., Develop CRM System for Logistics Company"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
              maxLength={255}
              required
            />
          </div>

          <div className="cjm-field">
            <label className="cjm-label" htmlFor="cjm-description">
              Description <span className="cjm-required">*</span>
            </label>
            <textarea
              id="cjm-description"
              className="cjm-textarea"
              placeholder="Describe your project requirements in detail…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={4}
              required
            />
          </div>

          <div className="cjm-field">
            <label className="cjm-label" htmlFor="cjm-category">
              Category <span className="cjm-required">*</span>
            </label>
            {loadingCategories ? (
              <div className="cjm-loading">Loading categories…</div>
            ) : (
              <select
                id="cjm-category"
                className="cjm-select"
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

          <div className="cjm-field">
            <label className="cjm-label" htmlFor="cjm-price">
              Budget (USD) <span className="cjm-required">*</span>
            </label>
            <input
              id="cjm-price"
              type="number"
              className="cjm-input"
              placeholder="e.g., 2500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isCreating}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="cjm-field">
            <label className="cjm-label" htmlFor="cjm-days">
              Estimated Days <span className="cjm-required">*</span>
            </label>
            <input
              id="cjm-days"
              type="number"
              className="cjm-input"
              placeholder="e.g., 14"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              disabled={isCreating}
              min="1"
              step="1"
              required
            />
          </div>

          <div className="cjm-field">
            <label className="cjm-label" htmlFor="cjm-tags">
              Technologies & Skills
            </label>
            <input
              id="cjm-tags"
              type="text"
              className="cjm-input"
              placeholder="React, TypeScript, Django (comma-separated)"
              value={tagNames}
              onChange={(e) => setTagNames(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </form>

        <div className="cjm-footer">
          <button
            type="button"
            className="cjm-btn cjm-btn--cancel"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cjm-btn cjm-btn--create"
            disabled={isCreating || !title.trim() || !description.trim() || !category || !price || !estimatedDays}
            onClick={handleSubmit}
          >
            {isCreating ? "Posting…" : "Post Job"}
          </button>
        </div>
      </div>
    </div>
  );
}
