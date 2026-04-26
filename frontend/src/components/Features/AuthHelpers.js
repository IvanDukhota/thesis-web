export const onlyLetters = (v) => v.replace(/[0-9]/g, '');

export const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

export const REGIONS = [
    { value: 'north_america', label: 'North America' },
    { value: 'south_america', label: 'South America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia', label: 'Asia' },
    { value: 'africa', label: 'Africa' },
    { value: 'oceania', label: 'Oceania' },
    { value: 'middle_east', label: 'Middle East' },
];

export function validateStep(s, data) {
    const e = {};
    if (s === 1) {
        if (!data.firstName.trim()) e.firstName = 'First name is required.';
        else if (/\d/.test(data.firstName)) e.firstName = 'No numbers allowed.';
        if (!data.lastName.trim()) e.lastName = 'Last name is required.';
        else if (/\d/.test(data.lastName)) e.lastName = 'No numbers allowed.';
        if (!data.nick.trim()) e.nick = 'Display name is required.';
    }
    if (s === 2) {
        if (!data.gender) e.gender = 'Please select a gender.';
        const age = Number(data.age);
        if (!data.age || isNaN(age) || age < 13 || age > 120) e.age = 'Enter a valid age (13–120).';
        if (!data.region) e.region = 'Please select a region.';
    }
    if (s === 3) {
        if (!data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email.';
        if (data.password.length < 6) e.password = 'Minimum 6 characters.';
        if (data.password !== data.password2) e.password2 = 'Passwords do not match.';
    }
    return e;
}