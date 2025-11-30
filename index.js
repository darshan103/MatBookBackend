const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------ FORM SCHEMA ------------------------
const formSchema = {
    title: "EMPLOYEE FORM",
    description: "Fill your employee details carefully",
    fields: [
        {
            name: "fullName",
            label: "Full Name",
            type: "text",
            required: true,
            placeholder: "Enter your name",
            validations: {
                minLength: 3,
                maxLength: 30
            }
        },
        {
            name: "age",
            label: "Age",
            type: "number",
            required: true,
            validations: { min: 18, max: 60 }
        },
        {
            name: "gender",
            label: "Gender",
            type: "select",
            required: true,
            options: ["Male", "Female", "Other"],
            validations: {}
        },
        {
            name: "skills",
            label: "Skills",
            type: "multi-select",
            options: ["React", "Node", "Tailwind", "AWS"],
            validations: { minSelected: 1, maxSelected: 3 }
        },
        {
            name: "joinDate",
            label: "Joining Date",
            type: "date",
            validations: { minDate: "2025-01-01" }
        },
        {
            name: "bio",
            label: "Bio",
            type: "textarea",
            placeholder: "Write about yourself",
            validations: { minLength: 10, maxLength: 200 }
        },
        {
            name: "isActive",
            label: "Active Employee",
            type: "switch",
            validations: {}
        },
    ],
};

app.get("/api/form-schema", (req, res) => {
    res.json(formSchema);
});

// ------------------------ VALIDATION ------------------------
// function validateSubmission(data) {
//     const errors = {};

//     formSchema.fields.forEach((field) => {
//         const value = data[field.name];
//         const rules = field.validations || {};

//         if (field.required && !value) {
//             errors[field.name] = `${field.name} is required`;
//             return;
//         }

//         if (field.type === "text") {
//             if (rules.minLength && value.length < rules.minLength)
//                 errors[field.name] = `At least ${rules.minLength} characters required`;
//             if (rules.maxLength && value.length > rules.maxLength)
//                 errors[field.name] = `Max ${rules.maxLength} characters allowed`;
//         }

//         if (field.type === "number") {
//             if (rules.min && value < rules.min)
//                 errors[field.name] = `Minimum allowed age is ${rules.min}`;
//             if (rules.max && value > rules.max)
//                 errors[field.name] = `Maximum allowed age is ${rules.max}`;
//         }

//         if (field.type === "select") {
//             if (!field.options.includes(value))
//                 errors[field.name] = `Invalid option selected`;
//         }

//         if (field.type === "multi-select") {
//             if (rules.minSelected && value.length < rules.minSelected)
//                 errors[field.name] = `Select at least ${rules.minSelected} items`;

//             if (rules.maxSelected && value.length > rules.maxSelected)
//                 errors[field.name] = `Select at max ${rules.maxSelected} items`;
//         }

//         if (field.type === "date") {
//             if (rules.minDate && new Date(value) < new Date(rules.minDate))
//                 errors[field.name] = `Date must be after ${rules.minDate}`;
//         }
//     });

//     return errors;
// }

// -------------------- VALIDATION MIDDLEWARE --------------------
const validateSubmissionMiddleware = (req, res, next) => {
    const data = req.body;
    const errors = {};

    formSchema.fields.forEach((field) => {
        const value = data[field.name];
        const rules = field.validations || {};

        // ---------- REQUIRED ----------
        if (field.required && (value === undefined || value === "")) {
            errors[field.name] = `${field.label} is required`;
            return;
        }

        // ---------- TEXT ----------
        if (field.type === "text") {
            if (rules.minLength && value.length < rules.minLength)
                errors[field.name] = `At least ${rules.minLength} characters required`;

            if (rules.maxLength && value.length > rules.maxLength)
                errors[field.name] = `Max ${rules.maxLength} characters allowed`;
        }

        // ---------- NUMBER ----------
        if (field.type === "number") {
            if (rules.min && value < rules.min)
                errors[field.name] = `Minimum allowed value is ${rules.min}`;

            if (rules.max && value > rules.max)
                errors[field.name] = `Maximum allowed value is ${rules.max}`;
        }

        // ---------- SELECT ----------
        if (field.type === "select") {
            if (!field.options.includes(value))
                errors[field.name] = `Invalid option selected`;
        }

        // ---------- MULTI-SELECT ----------
        if (field.type === "multi-select") {
            if (!Array.isArray(value)) return;

            if (rules.minSelected && value.length < rules.minSelected)
                errors[field.name] = `Select at least ${rules.minSelected} items`;

            if (rules.maxSelected && value.length > rules.maxSelected)
                errors[field.name] = `Select at most ${rules.maxSelected} items`;
        }

        // ---------- DATE ----------
        if (field.type === "date") {
            if (rules.minDate && new Date(value) < new Date(rules.minDate))
                errors[field.name] = `Date must be after ${rules.minDate}`;
        }
    });

    // If validation failed → return error response
    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            errors,
        });
    }

    next(); // Continue to next route handler
};


// ------------------------ POST SUBMISSION ------------------------
app.post("/api/submissions", validateSubmissionMiddleware, (req, res) => {
    const data = req.body;

    // const errors = validateSubmission(data);
    // if (Object.keys(errors).length > 0) {
    //     return res.status(400).json({ success: false, errors });
    // }

    const submissionId = uuidv4();
    const createdAt = new Date().toISOString();

    const query = `
        INSERT INTO submissions 
        (submissionId, fullName, age, gender, skills, joinDate, bio, isActive, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        query,
        [
            submissionId,
            data.fullName,
            data.age,
            data.gender,
            JSON.stringify(data.skills),
            data.joinDate,
            data.bio,
            data.isActive ? 1 : 0,
            createdAt
        ],
        function (err) {
            if (err) {
                console.log("DB Error:", err);
                return res.status(500).json({ success: false, message: "Database insert failed" });
            }

            res.status(201).json({
                success: true,
                submissionId,
                createdAt,
                message: "Submission saved successfully!"
            });
        }
    );
});

// ------------------------ GET SUBMISSIONS (SERVER-SIDE PAGINATION) ------------------------
app.get("/api/submissions", (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let sort = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    let offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) AS total FROM submissions`;

    db.get(countQuery, [], (err, countResult) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Count query failed" });
        }

        const totalItems = countResult.total;
        const totalPages = Math.ceil(totalItems / limit);

        const dataQuery = `
            SELECT submissionId, fullName, age, gender, skills, joinDate, bio, isActive, createdAt
            FROM submissions
            ORDER BY createdAt ${sort}
            LIMIT ? OFFSET ?
        `;

        db.all(dataQuery, [limit, offset], (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Data fetch failed" });
            }

            const formattedRows = rows.map((row) => ({
                ...row,
                skills: JSON.parse(row.skills || "[]").map((s) =>
                    typeof s === "string" ? s : s.label
                ),
                isActive: row.isActive === 1
            }));

            res.json({
                success: true,
                data: formattedRows,
                pageInfo: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });
        });
    });
});

// ------------------------ SERVER START ------------------------
app.listen(5000, () => {
    console.log("Backend server running on port 5000");
});
