import { useState, useEffect, useRef } from "react";
import { RiCloseLine, RiAttachmentLine, RiAddLine, RiEyeLine, RiEditLine } from "react-icons/ri";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getCategories, getTags, updateOrder, getOrder, type Category, type Tag, type OrderDetail } from "../../../../api/marketplace";
import TagSelectionModal from "../TagSelectionModal/TagSelectionModal";
import "../CreateJobModal/create-job-modal.css";

type ExistingAttachment = { id: string; filename: string; url: string };

type EditOrderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: OrderDetail;
  onSaved: (order: OrderDetail) => void;
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "stopped", label: "Stopped" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EditOrderModal({ isOpen, onClose, order, onSaved }: EditOrderModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [orderStatus, setOrderStatus] = useState("open");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [keptAttachments, setKeptAttachments] = useState<ExistingAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(order.title);
    setDescription(order.description);
    setCategory(order.category?.id ?? "");
    setPrice(order.price);
    setEstimatedDays(String(order.estimated_days));
    setOrderStatus(order.status);
    setSelectedTags(order.tags ?? []);
    setKeptAttachments(
      (order.attachments ?? []).map((a) => ({ id: a.id, filename: a.filename, url: a.url }))
    );
    setNewFiles([]);

    const load = async () => {
      setLoadingCategories(true);
      try {
        const [cats, tags] = await Promise.all([getCategories(), getTags(100)]);
        setCategories(cats);
        setAllTags(tags);
      } finally {
        setLoadingCategories(false);
      }
    };
    void load();
  }, [isOpen, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category || !price || !estimatedDays) {
      alert("Please fill in all required fields");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) { alert("Please enter a valid price"); return; }
    const daysNum = parseInt(estimatedDays, 10);
    if (isNaN(daysNum) || daysNum <= 0) { alert("Please enter a valid number of days"); return; }

    setIsSaving(true);
    try {
      await updateOrder(order.slug, {
        title: title.trim(),
        description: description.trim(),
        category,
        price: priceNum,
        estimated_days: daysNum,
        status: orderStatus,
        tag_names: selectedTags.map((t) => t.name),
        keep_attachment_ids: keptAttachments.map((a) => a.id),
        attachments: newFiles.length > 0 ? newFiles : undefined,
      });
      const fresh = await getOrder(order.slug);
      // Clear translation fields since they were deleted on backend
      fresh.translated_title = null;
      fresh.translated_description = null;
      fresh.translation_status = null;
      onSaved(fresh);
    } catch (error) {
      console.error("Failed to update order:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = "";
    }
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
            <span className="cjm-title">Edit Job</span>
            <button className="cjm-close" onClick={onClose} disabled={isSaving}>
              <RiCloseLine size={18} />
            </button>
          </div>

          <form className="cjm-body" onSubmit={handleSubmit}>
            <div className="cjm-grid">

              <div className="cjm-col">
                <div className="cjm-field">
                  <label className="cjm-label" htmlFor="eom-title">
                    Title <span className="cjm-required">*</span>
                  </label>
                  <textarea
                    id="eom-title"
                    className="cjm-input cjm-input--title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSaving}
                    maxLength={255}
                    required
                    rows={2}
                  />
                </div>

                <div className="cjm-field">
                  <label className="cjm-label">
                    Category <span className="cjm-required">*</span>
                  </label>
                  {loadingCategories ? (
                    <div className="cjm-loading">Loading categories…</div>
                  ) : (
                    <div className="cjm-dropdown" ref={categoryRef}>
                      <button
                        type="button"
                        className={`cjm-dropdown__trigger${isCategoryOpen ? " cjm-dropdown__trigger--open" : ""}${!category ? " cjm-dropdown__trigger--placeholder" : ""}`}
                        onClick={() => !isSaving && setIsCategoryOpen((v) => !v)}
                        disabled={isSaving}
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
                  <label className="cjm-label">Status</label>
                  <div className="cjm-dropdown" ref={statusRef}>
                    <button
                      type="button"
                      className={`cjm-dropdown__trigger${isStatusOpen ? " cjm-dropdown__trigger--open" : ""}`}
                      onClick={() => !isSaving && setIsStatusOpen((v) => !v)}
                      disabled={isSaving}
                    >
                      <span>{STATUS_OPTIONS.find((o) => o.value === orderStatus)?.label ?? orderStatus}</span>
                      <svg className="cjm-dropdown__arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isStatusOpen && (
                      <div className="cjm-dropdown__menu">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`cjm-dropdown__item${orderStatus === opt.value ? " cjm-dropdown__item--active" : ""}`}
                            onClick={() => { setOrderStatus(opt.value); setIsStatusOpen(false); }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="cjm-field">
                  <label className="cjm-label" htmlFor="eom-price">
                    Budget (USD) <span className="cjm-required">*</span>
                  </label>
                  <input
                    id="eom-price"
                    type="number"
                    className="cjm-input"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={isSaving}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="cjm-field">
                  <label className="cjm-label" htmlFor="eom-days">
                    Estimated Days <span className="cjm-required">*</span>
                  </label>
                  <input
                    id="eom-days"
                    type="number"
                    className="cjm-input"
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(e.target.value)}
                    disabled={isSaving}
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
                          onClick={() => setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id))}
                          disabled={isSaving}
                        >
                          <RiCloseLine size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cjm-tag cjm-tag--add"
                      onClick={() => setIsTagModalOpen(true)}
                      disabled={isSaving}
                    >
                      <RiAddLine size={13} /> Add Skills
                    </button>
                  </div>
                </div>
              </div>

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
                      disabled={isSaving}
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
                      id="eom-description"
                      className="cjm-textarea cjm-textarea--markdown"
                      placeholder="Describe your project requirements in detail… (Markdown supported)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isSaving}
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
                    disabled={isSaving}
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.mp4,.avi,.mov,.wmv,.flv,.mkv,.webm,.zip,.rar"
                  />
                  <button
                    type="button"
                    className="cjm-attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    <RiAttachmentLine size={15} />
                    Attach files
                  </button>
                  {keptAttachments.length > 0 && (
                    <div className="cjm-file-list">
                      {keptAttachments.map((att) => (
                        <div key={att.id} className="cjm-file-item">
                          <span className="cjm-file-name">{att.filename}</span>
                          <button
                            type="button"
                            className="cjm-file-remove"
                            onClick={() => setKeptAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                            disabled={isSaving}
                          >
                            <RiCloseLine size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {newFiles.length > 0 && (
                    <div className="cjm-file-list">
                      {newFiles.map((file, idx) => (
                        <div key={idx} className="cjm-file-item">
                          <span className="cjm-file-name">{file.name}</span>
                          <button
                            type="button"
                            className="cjm-file-remove"
                            onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={isSaving}
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
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cjm-btn cjm-btn--create"
              disabled={isSaving || !title.trim() || !description.trim() || !category || !price || !estimatedDays}
              onClick={handleSubmit}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
