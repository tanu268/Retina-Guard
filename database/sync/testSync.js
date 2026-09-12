const { addPatient } = require("./syncManager");

addPatient({
    name: "Test Patient",
    age: 45,
    gender: "Male",
    phone: "9999999999"
});