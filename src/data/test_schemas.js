export const TEST_SCHEMA = {
    "Soil and Rock": {
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
    "Soil": {
        "Sieve Analysis": [
            { id: "sieve_aperture", label: "Sieve Aperture (mm)", type: "number" },
            { id: "mass_retained", label: "Mass of soil retained (g)", type: "number" },
            { id: "cumulative_mass", label: "Cumulative Mass (g)", type: "number" },
            { id: "passing_perc", label: "Percentage Passing (%)", type: "number" }
        ]
    },
    "Water": {
        "pH Test": [
            { id: "ph_reading", label: "pH Reading", type: "number", step: "0.1" },
            { id: "temperature", label: "Temperature (°C)", type: "number" }
        ],
        "Chloride Test": [
            { id: "titre_value", label: "Titre Value (ml)", type: "number" },
            { id: "normality", label: "Normality", type: "number" }
        ]
    },
    "Cement": {
        "Consistency Test": [
            { id: "water_added", label: "Water Added (%)", type: "number" },
            { id: "penetration", label: "Penetration (mm)", type: "number" }
        ],
        "Setting Time": [
            { id: "initial_set", label: "Initial Setting Time (mins)", type: "number" },
            { id: "final_set", label: "Final Setting Time (mins)", type: "number" }
        ]
    }
};
