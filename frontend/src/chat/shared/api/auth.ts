import { apiRequest } from "./client";

export type User = {
  id: number;
  email: string;
  username: string;
  full_name: string;
  avatar?: string;
  created_at: string;
  is_contact?: boolean;
};

export type UserDirectoryResponse = {
  contacts: User[];
  others: User[];
};

export async function getMe() {
  return apiRequest<User>("/auth/me/", {
    method: "GET",
    auth: true,
  });
}

export async function getUserDirectory() {
  return apiRequest<UserDirectoryResponse>("/auth/directory/", {
    method: "GET",
    auth: true,
  });
}

export async function addContact(contactId: string) {
  return apiRequest<User>("/auth/contacts/create/", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      contact_id: contactId,
    }),
  });
}

export async function getContacts() {
  return apiRequest<User[]>("/auth/contacts/", {
    method: "GET",
    auth: true,
  });
}
