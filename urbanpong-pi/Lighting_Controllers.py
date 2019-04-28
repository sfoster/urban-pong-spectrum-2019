#! /usr/bin/python3
# -*- coding: utf-8 -*-

"""
    Module for controlling the SIRIS-E Model 5050-5RGBWN-3267 though ENTTEC OpenDMX Ethernet controller

   @author Rickie Kerndt (kerndtr@kerndt.com)
"""

from ola.ClientWrapper import ClientWrapper
import threading
from time import sleep
import ipaddress
import socket
import random
import struct
from ast import literal_eval
import array
from Resources import Colors, Urban_Pong_Effects, MACS

import datetime

class Lighting_Controller:
    """
    Abstract class for lighting controller interface
    """

    NORTH = 1
    SOUTH = 0

    def __init__(self):
        self.minimum_delay = 0.0 # type: float # define value to represent the minimum time for light to execute a
                                               # color change request. This value is used by the light controller and
                                               # game controller to limit the rate of light updates.

        self.origin = Lighting_Controller.NORTH

    def update(self, array):
        """

        :param array: byte array containing a sequence of 4 byte values for each device being controlled. byte
        values represent RGBI values
        :return:
        """
        pass

    def update_sequence(self, sequence, delays, repetitions):
        pass

class DMX_Pixel_LED (Lighting_Controller):


    def __init__(self):
        Lighting_Controller.__init__(self)

        # dmx bits
        self.wrapper = ClientWrapper()
        self.client = self.wrapper.Client()
        self.universe = 0 # type: int
        self.wait_on_dmx = threading.Event()
        self.dmx_succeeded = False

    def update(self, leds):
        """
        Send leds array to DMX controller
        :return: True if dmx update was successful
        """
        if self.origin != Lighting_Controller.NORTH:
            leds = self.flip_leds(leds, 4)
        self.client.SendDmx(self.universe, leds, self.dmx_callback)
        self.wait_on_dmx.clear()
        self.dmx_succeeded = False
        self.wrapper.Run()
        self.wait_on_dmx.wait()
        return self.dmx_succeeded

    def update_sequence(self, sequence, delays, repetitions):
        self.dmx_succeeded = True
        idx = 0
        num_delays = len(delays)
        for _ in range(repetitions):
            for leds in sequence:
                if self.origin != Lighting_Controller.NORTH:
                    leds = self.flip_leds(leds, 4)
                self.client.SendDmx(self.universe, leds, self.dmx_callback)
                sleep(delays[idx])
                if not self.dmx_succeeded:
                    break
                idx = (idx + 1) % num_delays
        return self.dmx_succeeded

    def set_origin(self, pole):
        """
        Sets origin of lights to either begin on NORTH or SOUTH pole. This will reverse the leds list when running
        from SOUTH.
        :param pole: Lighting_Controller.NORTH or Lighting_Controller.SOUTH
        :return: NONE
        """
        if pole != self.origin and pole in [Lighting_Controller.NORTH, Lighting_Controller.SOUTH]:
            self.origin = pole

    def flip_leds(self, leds, bytes_per_led):
        """
        Reverses the led byte array
        :param leds:
        :return:
        """
        num_bytes = len(leds)
        byte_array = array.array('B', [0 for i in range(num_bytes)])
        jdx = 0
        for idx in range(num_bytes - bytes_per_led, 0, -bytes_per_led):
            byte_array[jdx] = leds[idx]
            byte_array[jdx+1] = leds[idx+1]
            byte_array[jdx+2] = leds[idx+2]
            byte_array[jdx+3] = leds[idx+3]
            jdx += 4
        return byte_array

    def fade(self, location, color, milliseconds):
        """
        Transitions light to new color over time period in milliseconds
        :param location: index in self.devices to effect
        :param color:
        :param milliseconds: transition time to new color
        :return: None
        """
        pass

    def dmx_callback(self, status):
        """
        :param status: status code returned by SendDmx()
        :return: None
        """
        self.dmx_succeeded = status.Succeeded()
        self.wrapper.Stop()
        self.wait_on_dmx.set()


class LIFX:
    """
    Constants for use in constructing and processing LIFX LAN messages
    SV_ := services exposed on devices. currently only UDP communication
    DM_ := Device Message Types
    LM_ := Light Message Types
    FRAME_HEADER := provides a base field, the message size must be set in the first 16bits of

    NOTE: multi-zone and tile messages are not included

    """

    KELVIN = 2700
    MAX_BRIGHTNESS = 0.1 # 0.0 - 1.0 set maximum brightness on HSB color wheel

    # LIFX lights can run north or south
    NORTH = 1
    SOUTH = 0

    SV_UDP = 1
    DM_GetService = 2
    DM_GetHostInfo = 12
    DM_StateHostInfo = 13
    DM_GetHostFirmware = 14
    DM_StateHostFirmware = 15
    DM_GetWifiInfo = 16
    DM_StateWifiInfo = 17
    DM_GetPower = 20
    DM_StatePower = 22
    DM_GetLabel = 23
    DM_SetLabel = 24
    DM_StateLabel = 25
    DM_GetVersion = 32
    DM_StateVersion = 33
    DM_GetInfo = 34
    DM_StateInfo = 35
    DM_GetLocation = 48
    DM_SetLocation = 49
    DM_StateLocation = 50
    DM_GetGroup = 51
    DM_SetGroup = 52
    DM_StateGroup = 53
    DM_EchoRequest = 58
    DM_EchoResponse = 59
    LM_Get = 101
    LM_SetColor = 102
    LM_SetWaveform = 103
    LM_SetWaveformOptional = 119
    LM_State = 107
    LM_GetPower = 116
    LM_SetPower = 117
    LM_StatePower = 118
    LM_GetInfrared = 120
    LM_StateInfrared = 121
    LM_SetInfrared = 122

    DM_types = {2: "GetService",
                     12: "GetHostInfo",
                     13: "StateHostInfo",
                     14: "GetHostFirmware",
                     15: "StateHostFirmware",
                     16: "GetWifiInfo",
                     17: "StateWifiInfo",
                     20: "GetPower",
                     22: "StatePower",
                     23: "GetLabel",
                     24: "SetLabel",
                     25: "StateLabel",
                     32: "GetVersion",
                     33: "StateVersion",
                     34: "GetInfo",
                     35: "StateInfo",
                     48: "GetLocation",
                     49: "SetLocation",
                     50: "SetLocation",
                     51: "GetGroup",
                     52: "SetGroup",
                     53: "StateGroup",
                     58: "EchoRequest",
                     59: "EchoResponse"}

    LM_types = {101: "Get",
                     102: "SetColor",
                     103: "SetWaveform",
                     119: "SetWaveformOptional",
                     107: "State",
                     116: "GetPower",
                     117: "SetPower",
                     118: "StatePower",
                     120: "GetInfrared",
                     121: "StateInfrared",
                     122: "SetInfrared"}

    def __init__(self):
        pass

    @staticmethod
    def lookup_type(buffer):
        """
        Returns the message type number
        :param buffer: bytes object containing a LIFX device or light message
        :return: int where buffer contains a valid LIFX message or None when type does not
        match a LIFX message
        """
        type = None # type: int

        # slice out the Protocol Header bytes and unpack
        if len(buffer) >= 224:
            type_bytes = buffer[192:208]
            type = LIFX.unpack_uint16_t(type_bytes)
            if (type not in LIFX.DM_types) or (type not in LIFX.LM_types):
                type = None
        else:
            raise ValueError

        return type


    @staticmethod
    def LSB_to_MSB(buffer):
        """
        LIFX sends packets in little edian order rather than network order so need a function to
        convert.
        :param buffer: bytes with even length
        :return: bytes
        """
        length = len(buffer)
        MSB_order = bytearray(length)
        MSB_bytes = None
        if length % 2 == 0:
            for idx in range(0, length, 2):
                MSB_order[idx] = buffer[idx+1]
                MSB_order[idx+1] = buffer[idx]
            MSB_bytes = bytes(MSB_order)

        if length == 1:
            MSB_bytes = buffer

        return MSB_bytes

    @staticmethod
    def unpack_uint8_t(buffer):
        """
        Unpacks a bytes object containg a single byte (uint8_t)
        :param bytes:
        :return: int returns None if invalid format or bytes as int if valid
        """
        format = "<B"
        result = None
        if len(buffer) == 1:
            result = struct.unpack(format, buffer)

        return result

    @staticmethod
    def unpack_uint16_t(buffer):
        """
        Unpacks byte object containing unsigned short (uint16_t)
        :param bytes:
        :return: int returns None if invalid format or bytes as int if valid
        """
        format = "<H"
        result = None
        if len(buffer) == 2:
            result = struct.unpack(format, buffer)

        return result

    @staticmethod
    def unpack_uint32_t(buffer):
        """
        Unpacks byte object containing unsigned int (uint32_t)
        :param buffer:
        :return: return None if invalid format or bytes as int if valid
        """
        format = "<I"
        result = None
        if len(buffer) == 4:
            result = struct.unpack(format, buffer)

        return result

    @staticmethod
    def unpack_unit64_t(buffer):
        """
        Unpacks byte object containing unsigned long long
        :param buffer:
        :return: None if invalid format or bytes as int if valid
        """
        format = "<Q"
        result = None
        if len(buffer) == 8:
            result = struct.unpack(format, buffer)

        return result


class LIFX_Controller (Lighting_Controller, LIFX):

    def __init__(self, address, cidr):

        Lighting_Controller.__init__(self)
        LIFX.__init__(self)
        self.port = 56700
        self.cidr = str(cidr)
        self.ip_address = ipaddress.ip_address(address)
        self.source = random.randrange(0xFFFF)
        self.minimum_delay = 0.06
        self.ip_network = None
        print("configuring for address: <%s> " % (address + '/' + self.cidr))
        self.ip_network = ipaddress.ip_network(address + '/' + self.cidr, strict=False)
        self.devices = self.discover() # list of LIFX Light objects
        self.origin = LIFX.SOUTH

        #initialize sequence to a random int
        self.sequence = random.randrange(0xFF)

    def set_origin(self, pole):
        """
        Sets origin of lights to either begin on NORTH or SOUTH pole
        :param pole: LIFX.NORTH or LIFX.SOUTH
        :return: NONE
        """
        if pole != self.origin:
            self.devices.reverse()
            self.origin = pole

    def update(self, color_array):
        """
        Sends a color message to each light where its corresponding color values reprensent a change in color
        for that light.
        :param array: bytes array of RGBI values for lights
        :return: Boolean True or False
        """

        if color_array is None:
            print("ERROR: attempted to update lights with None")
            return False

        for n, light in enumerate(self.devices):
            idx = n * 4
            new_color = tuple(color_array[idx:idx+3])
            if new_color != light.color:
                light.color = new_color
                message = LIFX_Message_SetColor(self.source, light.mac, self.next_sequence(), new_color, 0)
                #mark_message = datetime.datetime.now()
                self.send_message(light.socket, message)
                #elapsed = mark_message - datetime.datetime.now()
                #print("light %d updated in %f seconds" % (n, elapsed.total_seconds()))

        #elapsed = datetime.datetime.now() - mark
        #print("All lights updated in %f seconds" % elapsed.total_seconds())

        return True

    def update_sequence(self, sequences, delays, repetitions):
        """
        Processes a list of led arrays and delays
        :param sequence:
        :param delays:
        :param repetitions:
        :return: None
        """

        for i in range(repetitions):
            for idx in range(len(sequences)):
                self.update(sequences[idx])
                sleep(delays[idx])

    def fade(self, location, color, milliseconds):
        """
        Transitions light to new color over time period in milliseconds
        :param location: index in self.devices to effect
        :param color:
        :param milliseconds: transition time to new color
        :return: None
        """
        if  0 <= location <  len(self.devices):
            light = self.devices[location]
            message = LIFX_Message_SetColor(self.source, light.mac, self.next_sequence(), color, milliseconds)
            self.send_message(light.socket, message)
            sleep( ( 2 * milliseconds ) / 1000.0 )
            light.color = color
        else:
            print("Did not find location <%d> in device list")

    def next_sequence(self):
        """
        Increments the current sequence rolling over value to stay within uint8_t range
        :return: int
        """
        self.sequence = (self.sequence + 1) % 0xFF
        return (self.sequence + 1) % 0xFF

    def create_socket(self, ip_address: ipaddress.ip_address):
        """
        Creates an udp socket appropriate for the ip_address object setting broadcast socket options
        if provided the broadcast address for self.ip_network
        :param ip_address:
        :return:
        """

        udp_socket = None
        family = socket.AF_INET
        if ip_address.version == 6:
            family = socket.AF_INET6
        try:
            udp_socket = socket.socket(family, socket.SOCK_DGRAM)
            if ip_address.exploded == self.ip_network.broadcast_address:
                udp_socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            print("Connecting udp socket to address <%s> port <%d>" % (ip_address, self.port))
            udp_socket.connect( (str(ip_address), self.port) )
        except socket.herror as err:
            print("socket error:  %s" % err)
        except socket.gaierror as err:
            print("gai error: %s" % err)
        except socket.timeout:
            print("socket timeout")


        return udp_socket

    def discover(self):
        """
        For now just process the hardcoded list of lights found in Resources. Eventually write a discovery routine
        to do this so doesn't have to be preconfigured.
        :return: list of LIFX LIght objects in sequence of play order
        """

        lights = [None] * len(MACS)
        for light in MACS:
            idx = light["order"] # type: int #
            address = ipaddress.ip_address(light["ipv4"])
            lights[idx] = LIFX_Smart_Light(light["mac"], address)
            lights[idx].socket = self.create_socket(address)

        return lights

    def send_message(self, socket: socket.socket, message):

        buffer = bytearray(len(message))
        message.pack(buffer, 0)

        # convert to array
        buffer_array = array.array('B', buffer)
        try:
            sent = socket.sendmsg([buffer_array])
            if sent == 0:
                print("Send error: no data was sent for message")
        except socket.herror as err:
            print("socket error: %s" % err)
        except socket.gaierror as err:
            print("gai error: %s" % err)
        except socket.timeout:
            print("socket timeout")


class LIFX_Frame_Header (LIFX):
    """
    The LIFX Frame Header is 64 bits long, value are held in python types with function provide
    to return a byte array representation. Tagged bit is set by default for addressing all devices
    (target set to zero in Frame Address Header)

    bit     function
    0-1     message origin indicator; always 00
    2       tagged, 1 -> clients to process request
    3       addressable, always set to 1
    4-15    source address # requires unique 12 bit address
    """
    def __init__(self, source):
        LIFX.__init__(self)
        self.struct_format = "<HHI"
        self.size = 0 # type: int # 16 bit field
        self.binary_field = 0x3400 # type: int # 16bit field
        self.source = 0 # type: int # 32 bit field
        if 0 <= source < 0xFFFFFFFF:
            self.source = source
        else:
            raise ValueError

    def set_size(self, n):
        """
        Sets size of LIFX message (uint_16)
        :param n:
        :return:
        """
        if n < 0xFFFF:
            self.size = n
        else:
            raise ValueError

    def set_tagged(self):
        """
        Set tagged bit for a broadcast packet
        :return: None
        """
        self.binary_field = self.binary_field | 0x2000

    def clear_tagged(self):
        """
        Clear tagged bit for a unicast packet
        :return: None
        """
        self.binary_field = self.binary_field & 0xDFFF

    def set_source(self, id):
        """
        Sets the source id in the frame header.
        :param id: 12 bit unique address
        :return: None
        """

        if 0 <= id <= 0xFFFF:
            self.binary_field = self.binary_field | id
        else:
            raise ValueError

    def pack(self, buffer, offset):
        """
        Constructs a packed c structure from properties
        :buffer: bufferarray
        :offset: int
        :return: bytes
        """
        struct.pack_into(self.struct_format, buffer, offset, self.size, self.binary_field, self.source)

    def __len__(self):
        return struct.calcsize(self.struct_format)

    def __str__(self):
        return "0x{:x}, 0x{:x}, 0x{:x}".format(self.size, self.binary_field, self.source)


class LIFX_Frame_Address (LIFX):
    """
    Set properties for and constructs the LIFX Frame Address fields
    """

    def __init__(self, target, sequence, ack, res):
        LIFX.__init__(self)
        self.struct_format = "<Q8B"

        # target is a 48bit mac address that must be left shifted into uint64_t
        self.target = target << 16 # type: int # uint64_t
        self.binary_field = 0 # type: int # unit8_t
        self.sequence = sequence # type: int # unit8_t

        if ack:
            self.set_ack()
        if res:
            self.set_res()

    def pack(self, buffer, offset):
        """
        Constructs a packed c structure from properties and provided target
        :return: byte array
        """
        struct.pack_into(self.struct_format, buffer, offset, self.target, 0,0,0,0,0,0, self.binary_field, self.sequence)

    def set_ack(self):
        """
        Sets the acknowledgement message required bit
        :return: None
        """
        self.binary_field = self.binary_field | 0x02

    def clear_ack(self):
        """
        Clears the acknowledgement message required bit
        :return: None
        """
        self.binary_field = self.binary_field & 0xFD

    def set_res(self):
        """
        Sets the response message required bit
        :return: None
        """
        self.binary_field = self.binary_field | 0x01

    def clear_res(self):
        """
        Clears the response message required bit
        :return: None
        """
        self.binary_field = self.binary_field & 0xFE

    def __len__(self):
        return struct.calcsize(self.struct_format)

    def __str__(self):
        return "0x{:x}, 0x{:x}, 0x{:x}".format(self.target, self.binary_field, self.sequence)

class LIFX_Protocol_Header (LIFX):

    def __init__(self, type):
        LIFX.__init__(self)
        self.struct_format = "<QHH"
        self.type = type

    def pack(self, buffer, offset):
        """
        Construts a packed c structure for the protocol header
        :return: bytes
        """
        return struct.pack_into(self.struct_format, buffer, offset, 0, self.type, 0)

    def __len__(self):
        return struct.calcsize(self.struct_format)

    def __str__(self):
        return "0x{:x}".format(self.type)


class LIFX_Message (LIFX):

    def __init__(self, source, target, sequence, type):
        LIFX.__init__(self)
        self.frame_header = LIFX_Frame_Header(source)

        #TODO: setting target to the light mac address is not working to control individual lights so using
        # unicast addressing with the target frame address set to zero (effect all lights)
        self.frame_address = LIFX_Frame_Address(0, sequence, False, False)
        self.protocol_header = LIFX_Protocol_Header(type)

        self.frame_header.set_size(len(self.frame_header) + len(self.frame_address) + len(self.protocol_header))

        if target != 0:
            self.frame_header.clear_tagged()

    def pack(self, buffer, offset):
        """
        :return: bytes
        """
        frame_header_size = len(self.frame_header)
        frame_address_size = len(self.frame_address)
        self.frame_header.pack(buffer, offset)
        offset += frame_header_size
        self.frame_address.pack(buffer, offset)
        offset += frame_address_size
        self.protocol_header.pack(buffer, offset)

    def __len__(self):
        return len(self.frame_header) + len(self.frame_address) + len(self.protocol_header)

    def __str__(self):
        return "[{:s}, {:s}, {:s}]".format(self.frame_header.__str__(), self.frame_address.__str__(), self.protocol_header.__str__())

class LIFX_Message_SetColor (LIFX_Message):
    """
    Creates a LIFX light SetColor message. Sequence number is auto set to next increment
    """

    TYPE = 102

    def __init__(self, source, target, sequence, rgb, duration):
        LIFX_Message.__init__(self, source, target, sequence, LIFX_Message_SetColor.TYPE)
        self.HSB = Colors.rgb_to_hsb(rgb)
        # apply maximum brightness and scale to 65535
        H = self.HSB[0]
        S = self.HSB[1]
        B = self.HSB[2]
        if B > LIFX.MAX_BRIGHTNESS:
            B = LIFX.MAX_BRIGHTNESS

        # LIFX lights take int values scaled to range 0-65535
        self.HSB = ( int(H * 65535 / 360), int(S * 65535), int(B * 65535))
        self.duration = duration
        self.payload_format = "<B4HI"
        self.frame_header.set_size(self.__len__())

    def pack(self, buffer, offset):
        payload_size = self.__len__()
        H, S, B = self.HSB
        LIFX_Message.pack(self, buffer, 0)
        offset = LIFX_Message.__len__(self)
        struct.pack_into(self.payload_format, buffer, offset, 0, H, S, B, Colors.KELVIN, self.duration)

    def __len__(self):
        return LIFX_Message.__len__(self) + struct.calcsize(self.payload_format)

    def __str__(self):
        format_string = "{:s}, {:s}, {:s}, 0x{:x}, 0x{:x}, 0x{:x}, 0x{:x}, 0x{:x}"
        return format_string.format(str(self.frame_header), str(self.frame_address), str(self.protocol_header), *self.HSB, Colors.KELVIN, self.duration)


class LIFX_Smart_Light:
    """
    Container of properties needed to communicate with LIFX lights
    """

    def __init__(self, mac, address: ipaddress.ip_address):

        self.mac = mac
        self.ip = address
        self.socket = None
        self.color = (0,0,0,0)

def main():

    lights = LIFX_Controller("192.168.0.100", 24)

    while True:
        rgb_text = input("(R,G,B): ")
        color = literal_eval(rgb_text)
        color = color + (0,)
        color_array = array.array('B', color * len(lights.devices))
        lights.update(color_array)


if __name__ == "__main__":
    main()