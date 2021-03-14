// Constants to use in calculations below
const ROUGHNESS = 0.000015; // ft
const GC = 32.17; // ft/sec**2
const FRICTIONFACTORKEY = 1.003;
// Coefficients (?) for calculating equivalent lengths
const NINETYELLS = 0.21;
const FORTYFIVEELLS = 0.105;
const TEEBRANCH = 1.14;
const TEELINE = 0.38;
const GLOBEVALVE = 6.5;
const GATEVALVE = 0.16;
const SWINGCHECK = 1.9;
const ANGLEVALVE = 2;

// Functions to use in calculating data

const significantFigHelper = function(value, precision) {
    // Helper function to make returning data with sig figs
    // I implemented this using however many sig figs were in the spreadsheet
    // It is possible to change this to be based on the data clients input if needed
    return parseFloat(Number.parseFloat(value).toPrecision(precision));
};
const fixedPointHelper = function (value, precision) {
    // Helper function to make returning data with sig figs
    // I implemented this using however many sig figs were in the spreadsheet
    // It is possible to change this to be based on the data clients input if needed
    return parseFloat(Number.parseFloat(value).toFixed(precision));
};
const findAndReplace = (targetID, replacementData) => {
        const target = document.getElementById(targetID);
        target.innerText = replacementData;
};

const calcDiameterInFeet = function(originalDiameter) {
    // Returns in feet
    let result = originalDiameter/12;
    return significantFigHelper(result, 4);
};

const calcKinimaticViscosity = function(viscosity, spgr) {
    // Returns in ft**2 per second
    let result = (0.00067197 * viscosity)/(62.37 * spgr);
    return significantFigHelper(result, 8)
};

const calcFlowArea = function(diameterInFeet) {
    // Returns in ft**2
    let result = Math.atan(1)*4*((diameterInFeet/2)**2);
    return significantFigHelper(result, 3)
};

const calcFlow = function(GPM) {
    // Returns in cubic feet per second
    let result = GPM * 0.002228;
    return significantFigHelper(result, 4)
};

const calcVelocity = function(flow, flowArea) {
    // Returns in fps
    let result = flow/flowArea;
    return significantFigHelper(result, 3)
};

const calcShearRate = function(GPM, diameterInInches){
    let x = (diameterInInches/2)**3;
    let result = (GPM/x) * 4.9;
    return significantFigHelper(result, 5)
};

const calcReynoldsNumber = function(diameterInFeet, velocity, kinimaticViscosity) {
    let result = (diameterInFeet*velocity)/kinimaticViscosity;
    return significantFigHelper(result, 4)
};

const calcEOverDiameter = function(diameterInFeet) {
    let result = ROUGHNESS/diameterInFeet;
    return fixedPointHelper(result, 4);
};

const calcHeadLoss = function(frictionFactor, totalLength, velocity, diameterInFeet, verticalRise) {
    // Returns in ft
    let numerator = (frictionFactor * totalLength * (velocity**2));
    let denominator = 2 * diameterInFeet * GC;
    let result = (numerator/denominator) + verticalRise;
    return significantFigHelper(result, 2)
};

const calcPressureDrop = function(headLoss, spgr) {
    // Returns in psig
    let result = (headLoss/2.31) * spgr;
    return significantFigHelper(result, 2)
};

const calcEquivalentLength = function(coefficientForPiece, diameterInFeet, frictionFactor, quantity) {
    let result = coefficientForPiece * diameterInFeet / frictionFactor * quantity
    return significantFigHelper(result, 4)
};

const calcDarcyValue = function(targetValue, diameterInFeet, reynoldsNumber) {
    let sqrtOfVal = Math.sqrt(targetValue);
    let endValue = 2.51 / (reynoldsNumber * sqrtOfVal);
    let valueToGoInLOG = (ROUGHNESS /(3.7*diameterInFeet)) + endValue;
    let darcyValue = -2 * sqrtOfVal * Math.log10(valueToGoInLOG);
    let result = darcyValue;
    return significantFigHelper(result, 10)
}; 

const createDarcyChart = function(arrayOfValues, diameterInFeet, reynoldsNumber) {
    // Creates an object and uses the "calcDarcyValue" function to populate the 
    // Darcy Weisbach charts
    const darcyChart = {};
    for (let v of arrayOfValues) {
        darcyChart[v] = calcDarcyValue(v, diameterInFeet, reynoldsNumber);
    };
    return darcyChart;
};

const findFrictionFactor = function(arrayOfValues, darcyChart, reynoldsNumber) {
    
    if (reynoldsNumber<2000) {
        return significantFigHelper(64/reynoldsNumber, 3);
    } else {
        // Initializing lastValue to the first value of the darcy chart will insure that
        // this will always return an actual number.
        let lastValue = 0.007;
        // Iterating over the previously used array instead of keys of the chart 
        // Because it is easier than trying to sort the keys of the chart
        for (let v of arrayOfValues) {
            // Check each associated value of the darcy chart with the key
            // If it is over then the last value is used
            // This was essentially how the vertical lookup in the excel sheet worked
            if (darcyChart[v] > FRICTIONFACTORKEY) {
                return lastValue;
            } else {
                 lastValue = v;
            }
        }
    }
    // If something goes wrong above return a negative number, 
    // which should lead to obviously wrong results. 
    // May change this to just throw an error - will talk to Adam
    
    return -1;
};

// The main function - this uses all of the above functions to collect calculations and data
// and combine them into a single object
const createData = function(GPM, diameterInInches, length, viscosity, spgr, verticalRise, nineties, fortyfives, teebranch, teeline, globe, gate, swing, angle) {
    const data = {}
    
    data.kinimaticViscosity = calcKinimaticViscosity(viscosity, spgr);
    data.diameterInFeet = calcDiameterInFeet(diameterInInches);
    data.flowArea = calcFlowArea(data.diameterInFeet);
    data.flowRate = calcFlow(GPM);
    data.velocity = calcVelocity(data.flowRate, data.flowArea);
    data.shearRate = calcShearRate(GPM, diameterInInches);
    data.EOverD = calcEOverDiameter(data.diameterInFeet);

    data.reynoldsNumber = calcReynoldsNumber(
                                        data.diameterInFeet, 
                                        data.velocity, 
                                        data.kinimaticViscosity
                                    );
    data.darcyChart = createDarcyChart(
                                    arrayForDarcyValues, 
                                    data.diameterInFeet, 
                                    data.reynoldsNumber
                                );
    data.frictionFactor = findFrictionFactor(
                                        arrayForDarcyValues, 
                                        data.darcyChart, 
                                        data.reynoldsNumber
                                    );
    
    // Fitting lengths will need friction factor and diameter in feet

    data.nineties = calcEquivalentLength(NINETYELLS, data.diameterInFeet, data.frictionFactor, nineties)
    data.fortyfives = calcEquivalentLength(FORTYFIVEELLS, data.diameterInFeet, data.frictionFactor, fortyfives)
    data.teebranches = calcEquivalentLength(TEEBRANCH, data.diameterInFeet, data.frictionFactor, teebranch)
    data.teelines = calcEquivalentLength(TEELINE, data.diameterInFeet, data.frictionFactor, teeline)
    data.globes = calcEquivalentLength(GLOBEVALVE, data.diameterInFeet, data.frictionFactor, globe)
    data.gates = calcEquivalentLength(GATEVALVE, data.diameterInFeet, data.frictionFactor, gate)
    data.swings = calcEquivalentLength(SWINGCHECK, data.diameterInFeet, data.frictionFactor, swing)
    data.angles = calcEquivalentLength(ANGLEVALVE, data.diameterInFeet, data.frictionFactor, angle)

    data.totalFittingLength = data.nineties + data.fortyfives + data.teebranches + data.teelines + data.globes + data.gates + data.swings + data.angles;
    
    data.totalLength = fixedPointHelper(parseFloat(length) + data.totalFittingLength, 0);

    // These two should be calculated last
    data.headLoss = calcHeadLoss(
                            data.frictionFactor, 
                            data.totalLength, 
                            data.velocity, 
                            data.diameterInFeet, 
                            verticalRise
                        );
    data.pressureDrop = calcPressureDrop(data.headLoss, spgr);

    return data;
};

// Generate values from .007 to .0918 stepping one in the ten thousandths place (.0071, .0072 etc.)
// These were the values from the Darcy Weisbach chart in the spreadsheet
let numberToAppend = 0.007;
const arrayForDarcyValues = [];
while (numberToAppend < 0.0919) {
    arrayForDarcyValues.push(parseFloat(significantFigHelper(numberToAppend, 3)));
    numberToAppend += 0.0001;
};

// Set up for submittal
const form = document.getElementById('form');

form.addEventListener('submit', (event) => {
    // Prevent form from submitting normally, which would erase the numbers the client input
    event.preventDefault();

    // Create the object with data needed, will use to populate charts
    const els = event.target.elements;
    const responseData = createData(
        parseFloat(els.gpm.value), 
        parseFloat(els.diameter.value),
        parseFloat(els.lengthInput.value),
        parseFloat(els.viscosity.value),
        parseFloat(els.spgr.value),
        parseFloat(els.verticalRise.value),
        parseFloat(els.nineties.value),
        parseFloat(els.fortyfives.value),
        parseFloat(els.teebranch.value),
        parseFloat(els.teeline.value),
        parseFloat(els.globe.value),
        parseFloat(els.gate.value),
        parseFloat(els.swing.value),
        parseFloat(els.angle.value)
    );
    findAndReplace('headLossValue', responseData.headLoss);
    findAndReplace('pressureDropValue', responseData.pressureDrop);
    findAndReplace('totalLengthValue', responseData.totalLength);
    findAndReplace('kinimaticViscosityValue', responseData.kinimaticViscosity);
    findAndReplace('diameterValue', responseData.diameterInFeet);
    findAndReplace('flowAreaValue', responseData.flowArea);
    findAndReplace('flowRateValue', responseData.flowRate);
    findAndReplace('velocityValue', responseData.velocity);
    findAndReplace('shearRateValue', responseData.shearRate);
    findAndReplace('reynoldsNumberValue', responseData.reynoldsNumber);
    findAndReplace('roughnessValue', ROUGHNESS);
    findAndReplace('gcValue', GC);
    findAndReplace('eodValue', responseData.EOverD);
    findAndReplace('frictionFactorValue', responseData.frictionFactor);
    findAndReplace('ninetiesValue', responseData.nineties);
    findAndReplace('fortyfivesValue', responseData.fortyfives);
    findAndReplace('teeBranchValue', responseData.teebranches);
    findAndReplace('teeLineValue', responseData.teelines);
    findAndReplace('globeValue', responseData.globes);
    findAndReplace('gateValue', responseData.gates);
    findAndReplace('swingValue', responseData.swings);
    findAndReplace('angleValue', responseData.angles);

    console.log(responseData);
});