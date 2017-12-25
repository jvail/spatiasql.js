if (!cb) {
	return initspatiasql();
}

};

if (typeof module !== 'undefined') module.exports = spatiasql;
if (typeof define === 'function') define(spatiasql);
