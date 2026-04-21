
export const TEST_SCHEMA = {
    "Soil Testing": {
        "Sieve Analysis": [
            { id: "sieve_aperture", label: "Sieve Aperture (mm)", type: "number" },
            { id: "mass_retained", label: "Mass of soil retained (g)", type: "number" },
            { id: "cumulative_mass", label: "Cumulative Mass (g)", type: "number" },
            { id: "passing_perc", label: "Percentage Passing (%)", type: "number" }
        ],
        "Moisture Content Test": [
            { id: "can_mass", label: "Mass of empty can (g)", type: "number" },
            { id: "wet_soil_mass", label: "Mass of can + wet soil (g)", type: "number" },
            { id: "dry_soil_mass", label: "Mass of can + dry soil (g)", type: "number" }
        ]
    },
    "Chemical Testing": {
        "pH Test": [
            { id: "ph_reading", label: "pH Reading", type: "number", step: "0.1" },
            { id: "temperature", label: "Temperature (°C)", type: "number" }
        ],
        "Chloride Test": [
            { id: "titre_value", label: "Titre Value (ml)", type: "number" },
            { id: "normality", label: "Normality", type: "number" }
        ]
    }
    // Add more as needed
};
