exports.roll = function(sides) {
	dieRoll = Math.floor(Math.random() * sides) + 1;
	return dieRoll;
}

exports.d6ToEmoji = function(number) {
	switch (number) {
		case 1:
			return "<:d6roll1:693941971869499532>";
		case 2:
			return "<:d6roll2:693941953397522462>";
		case 3:
			return "<:d6roll3:693941938168004679>";
		case 4:
			return "<:d6roll4:693941918131814452>";
		case 5:
			return "<:d6roll5:693941904324165712>";
		case 6:
			return "<:d6roll6:693941880920211486>";
	}
}