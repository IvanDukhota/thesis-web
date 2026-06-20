import { useState, useEffect } from "react";
import type { Tag } from "../../../../api/marketplace";
import "./tag-selection-modal.css";

type TagSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  allTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
};

export default function TagSelectionModal({
  isOpen,
  onClose,
  allTags,
  selectedTags,
  onTagsChange,
}: TagSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedTags, setLocalSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalSelectedTags(selectedTags);
      setSearchQuery("");
    }
  }, [isOpen, selectedTags]);

  const handleToggleTag = (tag: Tag) => {
    setLocalSelectedTags((prev) => {
      const exists = prev.some((t) => t.id === tag.id);
      if (exists) {
        return prev.filter((t) => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleApply = () => {
    onTagsChange(localSelectedTags);
    onClose();
  };

  const selectedTagIds = new Set(localSelectedTags.map((t) => t.id));

  const availableTags = allTags.filter((tag) => {
    if (selectedTagIds.has(tag.id)) return false;
    if (!searchQuery) return true;
    return tag.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="tag-modal-overlay" onClick={onClose}>
      <div className="tag-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="tag-modal-header">
          <h2 className="tag-modal-title">Select Technologies & Skills</h2>
          <button className="tag-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tag-modal-search">
          <input
            type="text"
            className="tag-modal-search-input"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {localSelectedTags.length > 0 && (
          <div className="tag-modal-section">
            <div className="tag-modal-section-title">Selected</div>
            <div className="tag-modal-tags">
              {localSelectedTags.map((tag) => (
                <button
                  key={tag.id}
                  className="tag-modal-tag tag-modal-tag--selected"
                  onClick={() => handleToggleTag(tag)}
                >
                  {tag.name}
                  <span className="tag-modal-tag__remove">×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="tag-modal-divider"></div>

        <div className="tag-modal-section">
          <div className="tag-modal-section-title">
            Available {searchQuery && `(${availableTags.length} results)`}
          </div>
          <div className="tag-modal-tags tag-modal-tags--scrollable">
            {availableTags.length === 0 ? (
              <div className="tag-modal-empty">
                {searchQuery ? "No skills found" : "All skills selected"}
              </div>
            ) : (
              availableTags.map((tag) => (
                <button
                  key={tag.id}
                  className="tag-modal-tag"
                  onClick={() => handleToggleTag(tag)}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="tag-modal-actions">
          <button className="tag-modal-button tag-modal-button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="tag-modal-button tag-modal-button--primary" onClick={handleApply}>
            Apply ({localSelectedTags.length})
          </button>
        </div>
      </div>
    </div>
  );
}
