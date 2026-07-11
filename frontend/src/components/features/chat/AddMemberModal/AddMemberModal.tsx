import { useEffect, useState } from "react";
import { RiCloseLine, RiSearchLine, RiCheckLine } from "react-icons/ri";
import { getAccessToken } from "../../../../shared/lib/token";
import "./addMemberModal.css";

type Contact = {
  id: number;
  email: string;
  full_name: string;
  avatar: string | null;
};

type AddMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  existingMemberIds: number[];
  onMembersAdded: () => void;
};

export default function AddMemberModal({
  isOpen,
  onClose,
  chatId,
  existingMemberIds,
  onMembersAdded,
}: AddMemberModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [isOpen, chatId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(contacts);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          (c) =>
            c.full_name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch("/api/users/contacts/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load contacts");
      }

      type Contact = {
        id: number;
        email: string;
        full_name: string;
        avatar: string | null;
      };

      const allContacts: Contact[] = await response.json();
      console.log("All contacts:", allContacts);
      console.log("Existing member IDs:", existingMemberIds);

      const availableContacts = allContacts.filter(
        (c) => !existingMemberIds.includes(c.id)
      );
      console.log("Available contacts:", availableContacts);

      setContacts(availableContacts);
      setFilteredContacts(availableContacts);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContact = (contactId: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;

    setIsAdding(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`/api/chats/${chatId}/members/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_ids: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add members");
      }

      onMembersAdded();
      onClose();
    } catch (error) {
      console.error("Failed to add members:", error);
      alert("Failed to add members. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const selectedContacts = filteredContacts.filter((c) => selectedIds.has(c.id));
  const unselectedContacts = filteredContacts.filter((c) => !selectedIds.has(c.id));
  const displayContacts = [...selectedContacts, ...unselectedContacts];

  return (
    <div className="add-member-modal__overlay" onClick={handleOverlayClick}>
      <div className="add-member-modal">
        <div className="add-member-modal__header">
          <h2 className="add-member-modal__title">Add members</h2>
          <button
            className="add-member-modal__close"
            onClick={onClose}
            title="Close"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="add-member-modal__search">
          <RiSearchLine size={18} className="add-member-modal__search-icon" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="add-member-modal__search-input"
          />
        </div>

        <div className="add-member-modal__content">
          {isLoading ? (
            <p className="add-member-modal__loading">Loading contacts...</p>
          ) : displayContacts.length === 0 ? (
            <p className="add-member-modal__empty">
              {searchQuery ? "No contacts found" : "No available contacts"}
            </p>
          ) : (
            <div className="add-member-modal__list">
              {displayContacts.map((contact) => {
                const isSelected = selectedIds.has(contact.id);
                return (
                  <div
                    key={contact.id}
                    className={`add-member-modal__contact ${
                      isSelected ? "add-member-modal__contact--selected" : ""
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <div className="add-member-modal__contact-avatar">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.full_name} />
                      ) : (
                        contact.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="add-member-modal__contact-info">
                      <div className="add-member-modal__contact-name">
                        {contact.full_name}
                      </div>
                      <div className="add-member-modal__contact-email">
                        {contact.email}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="add-member-modal__contact-check">
                        <RiCheckLine size={18} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="add-member-modal__footer">
          <button
            className="add-member-modal__cancel"
            onClick={onClose}
            disabled={isAdding}
          >
            Cancel
          </button>
          <button
            className="add-member-modal__add"
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || isAdding}
          >
            {isAdding ? "Adding..." : `Add (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
