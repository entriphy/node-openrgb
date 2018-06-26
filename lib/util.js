module.exports = {
    hexToGRB: function(hex) {
        if (typeof hex !== "string" || typeof hex !== "number") throw "Invalid hex code entered"; // Hex code must be a string or integer
        if (typeof hex === "number") hex = hex.toString(); // Convert to string if hex argument is an integer
        if (hex.charAt(0) === "#") hex = hex.slice(1); // Remove # if it contains one
        if (hex.length !== 6) throw "Invalid hex code specified"; // Hex code must have a max length of 6
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        let grb = [g, r, b]
        for (i = 0; i < grb.length; i++) {
            if (Number.isNaN(grb[i])) throw "Invalid hex code entered";
        }
        return grb; // When transmitting color, order goes GRB
    }
}