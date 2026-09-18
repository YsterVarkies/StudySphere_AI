const getCohorts = (req, res) => {
    try {
        return res.status(200).json({
            message: "Cohorts retrieved successfully.",
            cohorts: []
        });

    } catch (error) {
        console.error("Cohort retrieval error:", error);

        return res.status(500).json({
            message: "Server error while retrieving cohorts."
        });
    }
};


const createCohort = (req, res) => {
    try {
        const {
            cohort_name,
            year
        } = req.body;

        // Check required fields
        if (!cohort_name || !year) {
            return res.status(400).json({
                message: "Please provide cohort name and year."
            });
        }

        return res.status(201).json({
            message: "Cohort validation successful.",
            cohort: {
                cohort_name,
                year
            }
        });

    } catch (error) {
        console.error("Cohort creation error:", error);

        return res.status(500).json({
            message: "Server error while creating cohort."
        });
    }
};


module.exports = {
    getCohorts,
    createCohort
};