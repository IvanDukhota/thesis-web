export const onlyLetters = (v) => v.replace(/[0-9]/g, '');

export const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'uk', label: 'Ukrainian' },
    { value: 'ru', label: 'Russian' },
    { value: 'de', label: 'German' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'pl', label: 'Polish' },
];

export const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
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

export function validateStepOne(data) {
    const e = {};
    if (!data.nick.trim()) e.nick = 'Display name is required.';
    if (!data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email.';
    if (data.password.length < 6) e.password = 'Minimum 6 characters.';
    if (data.password !== data.password2) e.password2 = 'Passwords do not match.';
    return e;
}

export function validateStepTwo() {
    return {};
}

export function validateStepThree(data) {
    const e = {};
    if (data.age) {
        const age = Number(data.age);
        if (isNaN(age) || age < 13 || age > 120) e.age = 'Enter a valid age (13–120).';
    }
    return e;
}