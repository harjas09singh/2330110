const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const API_BASE_URL = 'http://4.224.186.213/evaluation-service';

function getOptimalSchedule(mechanicHours, tasks) {
    const n = tasks.length;
    const dp = Array(n + 1).fill(0).map(() => Array(mechanicHours + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        const { duration, impact } = tasks[i - 1];
        
        for (let w = 0; w <= mechanicHours; w++) {
            if (duration <= w) {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - duration] + impact);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    let remainingImpact = dp[n][mechanicHours];
    let remainingHours = mechanicHours;
    const selectedTasks = [];

    for (let i = n; i > 0 && remainingImpact > 0; i--) {
        if (remainingImpact !== dp[i - 1][remainingHours]) {
            const task = tasks[i - 1];
            selectedTasks.push(task);
            remainingImpact -= task.impact;
            remainingHours -= task.duration;
        }
    }

    return {
        totalImpact: dp[n][mechanicHours],
        hoursUsed: mechanicHours - remainingHours,
        selectedTasks: selectedTasks
    };
}

app.get('/api/schedule', async (req, res) => {
    try {
        const depotsResponse = await fetch(`${API_BASE_URL}/depots`);
        if (!depotsResponse.ok) {
            throw new Error(`Failed to fetch depots: ${depotsResponse.status}`);
        }
        const depotsData = await depotsResponse.json();

        const vehiclesResponse = await fetch(`${API_BASE_URL}/vehicles`);
        if (!vehiclesResponse.ok) {
            throw new Error(`Failed to fetch vehicles: ${vehiclesResponse.status}`);
        }
        const vehiclesData = await vehiclesResponse.json();

        const depots = depotsData.depots || depotsData || [];
        const tasks = vehiclesData.vehicles || vehiclesData || [];

        const schedules = [];

        for (const depot of depots) {
            const result = getOptimalSchedule(depot.mechanicHours, tasks);
            
            schedules.push({
                depotId: depot.id,
                allocatedMechanicHours: depot.mechanicHours,
                hoursUsed: result.hoursUsed,
                maxOperationalImpact: result.totalImpact,
                scheduledTasks: result.selectedTasks
            });
        }

        res.json({
            success: true,
            schedules: schedules
        });

    } catch (error) {
        console.error("Error generating schedule:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Vehicle Scheduling Microservice running on http://localhost:${PORT}`);
    console.log(`Hit http://localhost:${PORT}/api/schedule to run the scheduling algorithm.`);
});

