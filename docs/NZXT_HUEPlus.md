# NZXT HUE+
The NZXT HUE+ (sometimes stylized as Nzxt Hue+) is an RGB lighting controller that connects through a PC's internal USB 2.0 header, and is controlled by NZXT's own CAM software. The device receives commands by communicating through serial.

If you see anything incorrect or misworded, feel free to edit this.

## Reverse Engineering
This device can be reverse engineered by monitoring the packets between the NZXT CAM software and the HUE+. This can only be done on Windows, as CAM is only supported on the Windows platform. I'd recommend using [Free Serial Analyzer](https://freeserialanalyzer.com/) for this (though it does have a proprietary license and only comes with a 14-day trial; any other recommendations are welcome). The baud rate of the device is 256,000. If you plan to send the commands below, you should also **exit NZXT CAM** (not doing so will result in an "Access denied" error).

If you receive ``02`` from the device, that means you sent an incorrect/malformed command.

## Commands

### Turn on/off unit light
The white light on the top of the device can be toggled on/off by sending these hex values to the device:
**To turn on:** `46 00 c0 00 00 00 ff`
**To turn off:** `46 00 c0 00 00 ff 00`
The device should respond with `01` if it was successful.

### Get number of LED strips connected on each channel
This command will be helpful later on.
**Channel 1:** `8d 01`
**Channel 2:** `8d 02`
The device should respond like so:
``c0 d0 61 00 04``
The last value is the number of LED strips connected to the specified channel.

### Changing colors/modes
Now for the the fun part: changing the colors and mode (animation) of the LEDs. A basic color command starts a little something like this: `4b 00 01 03 02`

| Hex Value      | Description  |
| -------------  |------------|
| `4b`           | Color command header |
| `00`           | Mode: See table below this one   |
| `01`  		 | Channel: either 1, 2, or 0 (all channels)      |
| `03`			 | LED strip count/backwards/moving/color order: <br> This one's a little complicated, I'll explain this further later on. <br> This value starts at 0; if you have none or one LED strip <br> connected, this equals 0
| `02`           | Speed/size modifier: some modes can go faster, and <br> the marquee mode has a size modifier. On fixed mode, <br> this value equals `02` for some reason
All 5 bytes are **required**, or the command will be malformed.

#### Modes
The device comes with various modes/animations. Each modifier is required in the command (except multiple colors). To apply the mode, simply replace the 2nd byte with the hex value of the mode you want.
| Mode     | Hex Value | Modifiers |
| -------  | --------- | --------- |
| Fixed    | `00`      | Technically none, but NZXT's CAM sets the speed/size <br> to `02` for some reason
| Fading   | `01`      | Speed, multiple colors    |
| Spectrum | `02`      | Speed, backwards
| Marquee  | `03`      | Speed, size, backwards
| Covering Marquee | `04` | Speed, backwards, multiple colors
| Alternating | `05` | Speed, size, moving, multiple colors (**required**)
| Pulse | `06` | Speed, multiple colors
| Breathing | `07` | Speed, multiple colors
| Candle | `09` | None
| Wings | `0c` | Speed

#### Modifiers
This is the part where it kind of gets complicated, but here's a table I guess:
| Mode     | How to apply | Type |
| -------  | ------------ | -----|
| Speed    | Add `1 * speed` to the 5th byte | Integer (0 - 4)
| Size     | Add `8 * size` to the 5th byte | Integer (0 - 3)
| Moving   | Add 8 to the 4th byte | Boolean
| Backwards   | Add 10 to the 4th byte | Boolean
| Multiple colors | See the "Multiple colors" section | Integer

#### Colors
The device accepts colors in the GRB order.  In order to add colors to the command:
(pretend the color in question is #123456/RGB(18, 52, 86))
1. Get each RGB value as **hex values** from your color code
	* R: 12, G: 34, B: 56
2. Repeat this 40 times:
	* Add the G hex value to the command
	* Add the R hex value to the command
	* Add the B hex value to the command

Your command should have a total size of 125 bytes.

#### Multiple colors
*Todo: reword this part*
This part is completely optional for modes that support multiple colors (except for alternating mode). If you want multiple colors:
* Send the first command (see section below)
* Repeat for each color (max color count is 8):
	* Create a new command, but add 32 (`0x20`) to the 4th byte
	* Replace the color part of the command with the new one

For example, if I wanted to create a breathing animation (with a speed of 3) with the color order #123456 then #654321 (device has 4 LEDs connected; remember, LED count and speed modifier start at 0):
**First command:** `4b 07 01 03 02 <...120 bytes of the color #123456>`
**Second command:** `4b 07 01 23 02 <...120 bytes of the color #654321>`

#### Sending the command
After you're finished adding colors to the command, you should be able to send the command to the HUE+ and it should change accordingly. If it did, congratulations! If it didn't, then I either misdocumented something or there was a problem in your command. Here's a few things to check for:
* Is the command a total of 125 bytes?
* Are the first 5 bytes to the command implemented correctly?
* Did you add a modifier to a mode that doesn't support it?
* Is NZXT CAM open?
* From my experience, the device would start to ignore commands. Simply exit your program, open NZXT CAM, wait for it to load, and exit it.

Example command: #123456, breathing, fastest speed
```
4b 00 07 03 02 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12
56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34
12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56 34 12 56
```