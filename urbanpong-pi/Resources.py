"""
Resources for use in Lighting Controllers
"""

import array
import copy
import math

# color definitions
UO_GREEN  = (18, 70, 1, 0)
UO_YELLOW = (40, 30, 0, 0)
WHITE     = (255, 255, 255, 0)
RED       = (128, 0 , 0, 0)
BLUE      = (0, 0, 255, 0)

# dictionary of secret code, MAC addresses and ipv4 address for LIFX lights
MACS = [ { "order": 0, "code": "915-39-864", "mac": 0xd073d5282437, "ipv4": "192.168.0.110"},
         { "order": 1, "code": "798-44-995", "mac": 0xd073d5279706, "ipv4": "192.168.0.111"},
         { "order": 2, "code": "441-21-255", "mac": 0xd073d527baf7, "ipv4": "192.168.0.112"},
         { "order": 3, "code": "611-52-333", "mac": 0xd073d527a3ef, "ipv4": "192.168.0.113"},
         { "order": 4, "code": "582-83-392", "mac": 0xd073d527b92a, "ipv4": "192.168.0.114"},
         { "order": 5, "code": "612-97-588", "mac": 0xd073d52809cf, "ipv4": "192.168.0.115"},
         { "order": 6, "code": "586-25-771", "mac": 0xd073d528190d, "ipv4": "192.168.0.116"} ]

class Colors:
    """
    Predefined RGB color values with color space conversion functions
    """

    KELVIN = 2700

    black = (0,0,0)
    white = (255,255,255)
    red = (255,0,0)
    lime = (0,255,0)
    blue = (0,0,255)
    cyan = (0,255,255)
    magenta = (255,0,255)
    silver = (192,192,192)
    gray = (128,128,128)
    maroon = (128,0,0)
    olive = (128,128,0)
    green = (0,128,0)
    purple = (128,0,128)
    teal = (0,128,128)
    navy = (0,0,128)

    dark_red = (139,0,0)
    brown = (165,42,42)
    firebrick = (178,34,34)
    crimson = (220,20,60)
    orange_red = (255,69,0)

    dark_green = (0,100,0)
    forest_green = (34,139,34)

    deep_sky_blue = (0,191,255)
    light_sky_blue = (135,206,250)
    dark_blue = (0,0,139)
    dark_slate_blue = (72,61,139)

    dark_magenta = (139,0,139)
    dark_violet = (148,0,211)
    deep_pink = (255,20,147)

    saddle_brown = (139,69,19)
    chocolate = (210,105,30)
    dark_golden_rod = (184,134,11)
    golden_rod = (218,165,32)

    uo_green = (18,71,52)
    uo_yellow = (254,225,35)


    @staticmethod
    def artistic_additive_blend(color1, color2):
        """
        Return blended color derived from color1 and color2.
        "Artistic" because brightness exceeding 255 is represented by desaturation.
        """
        color3 = [
            color1[0] + color2[0],
            color1[1] + color2[1],
            color1[2] + color2[2]
        ]

        excess = max(color3) - 255
        if (excess <= 0):
            return color3

        for i in range(3):
            color3[i] = min(color3[i], 255)

        color3_hsb = Colors.rgb_to_hsb(color3)
        print("color3", color3, color3_hsb)

        return color3

    @staticmethod
    def adjust_brightness(rgb, allowed_max):
        """
        Scales the max rbg value to the desired setting. This effectively changes the color to a 'darker' hue.
        Useful if some lighting devices have too high of a white component with the pre-defined color code, though, you
        may be better off just picking a color code with a darker hue.
        :param rgb: tuple: 0-255 red, green, blue color values
        :param max: integer in range of 0-255.
        :return: tuple of rgb values
        """

        red = float(rgb[0])
        green = float(rgb[1])
        blue= float(rgb[2])

        maximum_value = max(rgb)
        if maximum_value > allowed_max:
            delta = maximum_value - allowed_max
            red = red - (red * (delta/allowed_max))
            green = green - (green * (delta/allowed_max))
            blue = blue - (blue * (delta/allowed_max))
        elif maximum_value < allowed_max:
            delta = allowed_max - maximum_value
            red = red + (red * (delta/allowed_max))
            green = green + (green * (delta/allowed_max))
            blue = blue + (blue * (delta/allowed_max))

        red = int(red)
        if red < 0:
            red = 0
        elif red > 255:
            red = 255
        green = int(green)
        if green < 0:
            green = 0
        elif green > 255:
            green = 255
        blue = int(blue)
        if blue < 0:
            blue = 0
        elif blue > 255:
            blue = 255
            
        return (red,green,blue)

    @staticmethod
    def fill_array(rgb, pixels, bytes_per_pixel):
        """
        Fills a byte array with the rgb color values
        :param rgb: red, green, blue color values in range 0-255
        :param pixels: number rgb elements in the array
        :param bytes_per_pixel:
        :return: byte array
        """

        num_bytes = pixels * bytes_per_pixel
        num_color_values = len(rgb)
        byte_array = array.array('B', [0 for i in range(num_bytes)])

        if num_color_values > bytes_per_pixel:
            raise ValueError

        for i in range(0, num_bytes, bytes_per_pixel):
            for j in range(num_color_values):
                byte_array[i+j] = rgb[j]

        return byte_array

    @staticmethod
    def rgb_to_hsb(rgb):
        """
        converts RGB values to HSB format
        Accepts values in range 0..255 and returns values in 0..1 (except for hue, which is 0..360)
        NOTE: this algorithm was taken from https://www.cs.rit.edu/~ncs/color/t_convert.html#RGB to HSV & HSV to RGB
        on June 11, 2018
        :param RGBK:
        :return: tuple of HSB values, zero values
        """

        hue = 0 # type: int
        saturation = 0 # type: int
        brightness = 0 # type: int
        result = (hue,saturation, brightness) # type: tuple

        if len(rgb) == 3:
            # scale to 0-1
            red = rgb[0] / 255.0
            green = rgb[1] / 255.0
            blue = rgb[2] / 255.0
            min_value = min(red, green, blue)
            max_value = max(red, green, blue)

            # validate input values
            if (min_value < 0) or (max_value > 1):
                raise ValueError

            brightness = max_value
            delta = max_value - min_value

            if max_value != 0:
                saturation = delta / max_value
            else:
                return result
            if red == max_value:
                if delta == 0:
                    hue = green - blue
                else:
                    hue = (green - blue) / delta
            elif green == max_value:
                if delta == 0:
                    hue = 2 + (blue -red)
                else:
                    hue = 2 + (blue - red) / delta
            else:
                if delta == 0:
                    hue = 4 + (red - green)
                else:
                    hue = 4 + (red - green) / delta
            hue = hue * 60
            if hue < 0: # prevent negative numbers
                hue = hue + 360

            result = (hue, saturation, brightness)

        return result

    @staticmethod
    def hsb_to_rgb(hsb):
        """
        Converts HSB values to RGB format
        Accepts values in range 0..1 and returns values in 0..255
        NOTE: this algorithm was taken from https://www.cs.rit.edu/~ncs/color/t_convert.html#RGB to HSV & HSV to RGB
        on April 28, 2019
        :param HSBK:
        :return: tuple of RGB values, zero values
        """

        i = 0
        f = 0.0
        p = 0.0
        q = 0.0
        t = 0.0

        red = 0
        green = 0
        blue = 0

        hue = hsb[0]
        saturation = hsb[1]
        brightness = hsb[2]

        if (saturation == 0):
            # achromatic (grey)
            red = green = blue = brightness
            return (red, green, blue)

        hue /= 60			# sector 0 to 5
        i = math.floor(hue)
        f = hue - i			# factorial part of h
        p = brightness * ( 1 - saturation )
        q = brightness * ( 1 - saturation * f )
        t = brightness * ( 1 - saturation * ( 1 - f ) )

        if (i == 0):
            red = brightness
            green = t
            blue = p

        elif (i == 1):
            red = q
            green = brightness
            blue = p
        elif (i ==  2):
            red = p
            green = brightness
            blue = t
        elif (i ==  3):
            red = p
            green = q
            blue = brightness
        elif (i ==  4):
            red = t
            green = p
            blue = brightness
        else:
            red = brightness
            green = p
            blue = q

        return (int(red*255), int(green*255), int(blue*255))



class Urban_Pong_Effects:
    """
    Sequences and delays for use in lighting effects
    """

    def __init__(self, pixels, bytes_per_pixel):

        self.pixels = pixels     # type: int # number of light elements
        self.bytes_per_pixel = bytes_per_pixel
        self.num_bytes = self.pixels * self.bytes_per_pixel

        self.uo_1 = array.array('B', [0 for i in range(self.num_bytes)])
        self.uo_2 = array.array('B', [0 for i in range(self.num_bytes)])

        self.uo_shuffle = ( [self.uo_1, self.uo_2], [0.1] )

        # initialize uo arrays with UO colors
        alternate = False
        for i in range(0, self.num_bytes, self.bytes_per_pixel):
            if alternate: # even pixels
                self.uo_1[i]   = Colors.uo_green[0]
                self.uo_1[i+1] = Colors.uo_green[1]
                self.uo_1[i+2] = Colors.uo_green[2]
                self.uo_2[i]   = Colors.uo_yellow[0]
                self.uo_2[i+1] = Colors.uo_yellow[1]
                self.uo_2[i+2] = Colors.uo_yellow[2]
                alternate = False
            else: # odd pixels
                self.uo_1[i]     = Colors.uo_yellow[0]
                self.uo_1[i + 1] = Colors.uo_yellow[1]
                self.uo_1[i + 2] = Colors.uo_yellow[2]
                self.uo_2[i]     = Colors.uo_green[0]
                self.uo_2[i + 1] = Colors.uo_green[1]
                self.uo_2[i + 2] = Colors.uo_green[2]
                alternate = True

    def blink_white(self, array, location, delay):
        """
        Sets location to white
        :return: tuple containing sequences and delays to use for effect
        """
        blink = copy.deepcopy(array)
        idx = location * self.bytes_per_pixel
        blink[idx] = Colors.white[0]
        blink[idx+1] = Colors.white[1]
        blink[idx+2] = Colors.white[2]

        return ([blink, array], [delay, delay])



