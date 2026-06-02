/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}", // <-- Это критически важно! Ищет классы во всех js/jsx файлах
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // Твой шрифт из App.jsx
            },
        },
    },
    plugins: [],
}