import { useState, useEffect, useRef } from "react";
import { RiCloseLine, RiAttachmentLine, RiAddLine, RiEyeLine, RiEditLine } from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getCategories, getTags, createOrder, type Category, type Tag, type OrderDetail } from "../../../../api/marketplace";
import TagSelectionModal from "../TagSelectionModal/TagSelectionModal";
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
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");
      setEstimatedDays("");
      setSelectedTags([]);
      setAttachments([]);
      loadCategories();
      loadTags();
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

  const loadTags = async () => {
    try {
      const data = await getTags(100);
      setAllTags(data);
    } catch (error) {
      console.error("Failed to load tags:", error);
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
      const tagNames = selectedTags.map((tag) => tag.name);

      const newOrder = await createOrder({
        title: title.trim(),
        description: description.trim(),
        category,
        price: priceNum,
        estimated_days: daysNum,
        tag_names: tagNames.length > 0 ? tagNames : undefined,
        status: "open",
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      onCreated(newOrder);
    } catch (error) {
      console.error("Failed to create job:", error);
      alert("Failed to create job. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      e.target.value = "";
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveTag = (tagToRemove: Tag) => {
    setSelectedTags((prev) => prev.filter((tag) => tag.id !== tagToRemove.id));
  };

  if (!isOpen) return null;

  return (
    <>
      <TagSelectionModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        allTags={allTags}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />

      <div className="cjm-overlay" onClick={onClose}>
        <div className="cjm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cjm-header">
            <span className="cjm-title">Post a Job</span>
            <button className="cjm-close" onClick={onClose} disabled={isCreating}>
              <RiCloseLine size={18} />
            </button>
          </div>

          <form className="cjm-body" onSubmit={handleSubmit}>
            <div className="cjm-grid">

              {/* Left column: All fields except Description and Attachments */}
              <div className="cjm-col">
                <div className="cjm-field">
                  <label className="cjm-label" htmlFor="cjm-title">
                    Title <span className="cjm-required">*</span>
                  </label>
                  <textarea
                    id="cjm-title"
                    className="cjm-input cjm-input--title"
                    placeholder="e.g., Develop CRM System"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isCreating}
                    maxLength={255}
                    required
                    rows={2}
                  />
                </div>

                <div className="cjm-field">
                  <label className="cjm-label" htmlFor="cjm-category">
                    Category <span className="cjm-required">*</span>
                  </label>
                  {loadingCategories ? (
                    <div className="cjm-loading">Loading categories…</div>
                  ) : (
                    <div className="cjm-dropdown" ref={categoryRef}>
                      <button
                        type="button"
                        className={`cjm-dropdown__trigger${isCategoryOpen ? " cjm-dropdown__trigger--open" : ""}${!category ? " cjm-dropdown__trigger--placeholder" : ""}`}
                        onClick={() => !isCreating && setIsCategoryOpen((v) => !v)}
                        disabled={isCreating}
                      >
                        <span>{category ? categories.find((c) => c.id === category)?.name : "Select a category"}</span>
                        <svg className="cjm-dropdown__arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {isCategoryOpen && (
                        <div className="cjm-dropdown__menu">
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              className={`cjm-dropdown__item${category === cat.id ? " cjm-dropdown__item--active" : ""}`}
                              onClick={() => { setCategory(cat.id); setIsCategoryOpen(false); }}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                  <label className="cjm-label">Technologies & Skills</label>
                  <div className="cjm-tags-container">
                    {selectedTags.map((tag) => (
                      <div key={tag.id} className="cjm-tag">
                        {tag.name}
                        <button
                          type="button"
                          className="cjm-tag-remove"
                          onClick={() => handleRemoveTag(tag)}
                          disabled={isCreating}
                        >
                          <RiCloseLine size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cjm-tag cjm-tag--add"
                      onClick={() => setIsTagModalOpen(true)}
                      disabled={isCreating}
                    >
                      <RiAddLine size={13} /> Add Skills
                    </button>
                  </div>
                </div>
              </div>

              {/* Right column: Description (with markdown) and Attachments */}
              <div className="cjm-col cjm-col--right">
                <div className="cjm-field cjm-field--description">
                  <div className="cjm-description-header">
                    <label className="cjm-label">
                      Description <span className="cjm-required">*</span>
                      <span className="cjm-label-hint">(Markdown supported)</span>
                    </label>
                    <button
                      type="button"
                      className="cjm-preview-toggle"
                      onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                      disabled={isCreating}
                      title={showMarkdownPreview ? "Edit" : "Preview"}
                    >
                      {showMarkdownPreview ? <RiEditLine size={14} /> : <RiEyeLine size={14} />}
                      {showMarkdownPreview ? "Edit" : "Preview"}
                    </button>
                  </div>

                  {showMarkdownPreview ? (
                    <div className="cjm-markdown-preview">
                      {description ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkBreaks, remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {description}
                        </ReactMarkdown>
                      ) : (
                        <p className="cjm-markdown-empty">Nothing to preview yet...</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      ref={descriptionRef}
                      id="cjm-description"
                      className="cjm-textarea cjm-textarea--markdown"
                      placeholder="Describe your project requirements in detail… (Markdown supported)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isCreating}
                      required
                    />
                  )}
                </div>

                <div className="cjm-field cjm-field--grow">
                  <label className="cjm-label">Attachments</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="cjm-file-input-hidden"
                    onChange={handleFileChange}
                    disabled={isCreating}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.mp4,.avi,.mov,.wmv,.flv,.mkv,.webm,.zip,.rar,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  />
                  <button
                    type="button"
                    className="cjm-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCreating}
                  >
                    <RiAttachmentLine size={15} />
                    Attach files
                  </button>
                  {attachments.length > 0 && (
                    <div className="cjm-file-list">
                      {attachments.map((file, index) => (
                        <div key={index} className="cjm-file-item">
                          <span className="cjm-file-name">{file.name}</span>
                          <button
                            type="button"
                            className="cjm-file-remove"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isCreating}
                          >
                            <RiCloseLine size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
    </>
  );
}
