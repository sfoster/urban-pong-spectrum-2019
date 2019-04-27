#! /usr/bin/python3

# -*- coding: utf-8 -*-

import array
from time import sleep
import datetime
import threading
import Lighting_Controllers
import math
import random
import copy
from Resources import Colors, Urban_Pong_Effects
from enum import Enum
from Lighting_Controllers import LIFX
from abc import abstractmethod

DEBUG = True

class Game_States(Enum):
    """
    """
    INIT = 0
    START = 1
    PLAY = 2
    PAUSED = 3

class Game:
    """
    Abstract class for designing games
    """


    def __init__(self, controller):
        """

        :param controller: class Controller
        """
        self.controller = controller
        self.timeout = None # timer object to limit time available for player to submit a POST request for game play
        self.players = None

    @abstractmethod
    def initialize(self):
        """
        Sets up state variables to game's INIT state.
        :return: None
        """
        pass

    @abstractmethod
    def reset(self):
        """
        Actions to reset game to START state
        :return: None
        """
        pass

    @abstractmethod
    def play(self):
        """
        Carries out one iteration of game play. This function is called in the Controller run loop
        :return: None
        """
        pass

    @abstractmethod
    def restart(self):
        """
        Sets up event objects and state variables to bring game back to the INIT state
        :return: None
        """
        pass

    @abstractmethod
    def terminate(self):
        """
        Sets up event objects and state variables necessary to terminate the game
        """
        pass

    @abstractmethod
    def action(self, data: dict):
        """
        Process json data dictionary received from POST request to control game play
        :param data:
        :return: None
        """
        pass

    @abstractmethod
    def is_valid_uuid(self, uuid):
        """
        Verifies that the uuid received with a POST request is valid for the game
        :param uuid:
        :return: boolean
        """
        return True


class SinglePlayer(Game):
    """
    Single player game that can be started from either end of the light strip
    """

    def __init__(self, controller):
        Game.__init__(self, controller)
        self.player_timeout = 60.0 # type float  # maxmum time in seconds we'll wait for a player action
        self.ball_color = Colors.blue
        self.initialize()

    def initialize(self):

        if self.timeout is not None:
            self.timeout.cancel()
            self.timeout = None

        # update controller attributes
        self.controller.south_end_action = Controller.WACK
        self.controller.direction = Controller.NORTH
        self.controller.location = 0
        self.controller.velocity = 0.5
        self.controller.velocity_delay = self.controller.pixel_length / self.controller.velocity
        self.controller.acceleration = 0.001
        self.controller.leds = copy.deepcopy(self.controller.default_scene)
        self.controller.state = Game_States.INIT

        self.controller.start_scene = copy.deepcopy(self.controller.default_scene)
        self.controller.start_scene[0] = self.ball_color[0]
        self.controller.start_scene[1] = self.ball_color[1]
        self.controller.start_scene[2] = self.ball_color[2]
        self.controller.start_event.clear()
        self.controller.play_event.clear()
        self.controller.continue_event.set()
        self.controller.terminate_event.clear()
        self.controller.restart_event.clear()
        self.hit_points = 10
        self.miss_points = 0
        self.penalty_points = 0
        self.players = None

        if self.controller.lighting is not None:
            self.controller.lighting.update(self.controller.leds)

        # limits game play length
        self.ball_limit = 3
        self.balls_used = 0

        self.wack_zone = 0.5 # meters from end which player may wack ball
        self.wack_zone_limit  = math.ceil(self.wack_zone / self.controller.pixel_length)

    def reset(self):

        self.controller.direction = Controller.NORTH
        self.controller.velocity = 0.5
        self.controller.velocity_delay = self.controller.pixel_length / self.controller.velocity
        self.controller.acceleration = 0.001
        self.controller.state = Game_States.START
        self.controller.location = 0
        self.controller.leds = copy.deepcopy(self.controller.default_scene)

        self.controller.play_event.clear()
        self.controller.continue_event.set()
        self.controller.start_event.set()


    def play(self):

        if self.controller.wack_event.isSet():
            if self.controller.direction == Controller.SOUTH:
                if self.controller.wacked_effect is not None:
                    sequences, delays = self.controller.wacked_effect(self.controller.leds, self.controller.location, self.controller.minimum_delay)
                    self.controller.lighting.update_sequence(sequences, delays, 1)
                    self.controller.direction = Controller.NORTH
                    self.controller.move_color(self.ball_color)
            self.controller.wack_event.clear()

        elif self.controller.direction == Controller.NORTH:

            # north starts at pixel 0 and moves towards pixel 63
            if self.controller.location == self.controller.num_pixels - 1:
                if DEBUG:
                    print("Bouncing off north end")
                if self.controller.bounce_effect is not None:
                    sequences, delays = self.controller.bounce_effect(self.controller.leds, self.controller.location, self.controller.minimum_delay)
                    self.controller.lighting.update_sequence(sequences, delays, 1)
                self.controller.direction = Controller.SOUTH
            else:
                self.controller.location += 1
                if DEBUG:
                    print("Moving ball south to location %d" % self.controller.location)
                self.controller.move_color(self.ball_color)
                if not self.controller.lighting.update(self.controller.leds):
                    self.controller.play_event.clear()

        # south starts at pixel num_pixels -1 and moves towards pixel 0
        elif self.controller.direction == Controller.SOUTH:
            if self.controller.location == 0:
                if self.ball_limit - self.balls_used > 0:
                    if self.controller.reset_effect is not None:
                        sequences, delays = self.controller.reset_effect()
                        self.controller.lighting.update_sequence(sequences, delays, 10)
                    if DEBUG:
                        print("Missed ball, resetting game")
                    self.reset()
                else:
                    # game over
                    if DEBUG:
                        print("Out of balls, reinitializing game")
                    self.controller.restart_event.set()
                    return
            else:
                self.controller.location -= 1
                if DEBUG:
                    print("Moving ball south to location %d" % self.controller.location)
                self.controller.move_color(self.ball_color)
                if not self.controller.lighting.update(self.controller.leds):
                    self.controller.play_event.set()

        # sleep to emulate velocity
        self.current_time = datetime.datetime.now()
        elapsed_time = self.current_time - self.controller.last_time
        if DEBUG:
            print("velocity = %f, sleeping for %f seconds" % (self.controller.velocity, self.controller.velocity_delay))
        sleep(self.controller.velocity_delay)

        # set next iteration and handle stalled game
        new_velocity = self.controller.velocity + (self.controller.acceleration * elapsed_time.total_seconds())
        if (self.controller.max_velocity > 0.0):
            if (0.0 > new_velocity > self.controller.max_velocity):
                new_velocity = self.controller.velocity
        self.controller.velocity = new_velocity
        self.controller.velocity_delay = self.controller.pixel_length / self.controller.velocity

    def restart(self):

        if self.timeout is not None:
            self.timeout.cancel()
            self.timeout = None
        self.controller.restart_event.set()
        self.controller.start_event.set()
        self.controller.play_event.set()
        self.controller.continue_event.set()

    def terminate(self):

        if self.timeout is not None:
            self.timeout.cancel()
            self.timeout = None
        self.controller.terminate_event.set()
        self.controller.start_event.set()
        self.controller.play_event.set()
        self.controller.continue_event.set()

    def action(self, data):

        if data['Action'] == 'wack':
            if not self.controller.play_event.is_set():
                # game stopped due to missed ball
                self.players[0].update_score(self.miss_points)
                if DEBUG:
                    print("wacked and missed")
            elif self.is_wackable():
                self.controller.wack_event.set()
                self.players[0].update_score(self.hit_points)
                if DEBUG:
                    print("wacked and hit")
            else:
                if DEBUG:
                    print("wacked outside of wack area")
                if (self.ball_limit - self.balls_used) > 0:
                    self.controller.play_event.clear()
                else:
                    self.restart()
        elif data['Action'] == 'start':
            if DEBUG:
                print("Received start command")
            if self.controller.start_event.is_set():
                if DEBUG:
                    print("ERROR: Player %s tried to start with game in progress" % (data['UUID'],))
                msg = "Game is owned by another player"
                return {'Result': 'Error', 'Value': msg}
            elif data['Value'] == 'south':
                self.controller.state = Game_States.START
                self.controller.lighting.set_origin(LIFX.SOUTH)
                player = Player(data['Name'], data['UUID'])
                self.players = [player]
                if DEBUG:
                    print("Starting game at south pole for player %s" % (data['UUID']))
                if self.controller.standby_event is not None:
                    self.controller.standby_event.set()
                self.controller.start_event.set()
            elif data['Value'] == 'north':
                self.controller.state = Game_States.START
                self.controller.lighting.set_origin(LIFX.NORTH)
                player = Player(data['Name'], data['UUID'])
                self.players = [player]
                if DEBUG:
                    print('Starting game at north pole for player %s' % (data['UUID'],))
                if self.controller.standby_event is not None:
                    self.controller.standby_event.set()
                self.controller.start_event.set()
            else:
                msg = ("Received start command without an origin")
                if DEBUG:
                    print("ERROR: %s" % (msg,))
                return {'Result': 'Error', 'Value': msg}
        elif data['Action'] == 'play' and self.controller.start_event.is_set():
            if DEBUG:
                print("Received play command")
            self.controller.state = Game_States.PLAY
            self.balls_used += 1
            if DEBUG:
                print("%d balls remaining" % (self.ball_limit - self.balls_used,))
            self.controller.play_event.set()
        elif data['Action'] == 'pause':
            if self.controller.state == Game_States.PLAY:
                if DEBUG:
                    print("Received pause command from player %s" % (data['UUID'],))
                self.controller.state = Game_States.PAUSED
                self.controller.continue_event.clear()
            else:
                if DEBUG:
                    print("Received pause command from player %s while game was not in play" % (data['UUID'],))
        elif data['Action'] == 'continue':
            if self.controller.state == Game_States.PAUSED:
                if DEBUG:
                    print("Received continue command from player %s, enabling game play" % (data['UUID'],))
                self.controller.state = Game_States.PLAY
                self.controller.continue_event.set()
            else:
                if DEBUG:
                    print("Received continue command when game was not paused")
        elif data['Action'] == 'exit' and self.controller.start_event.is_set():
            if DEBUG:
                print("Received exit command from player %s" % (data['UUID'],))
            self.controller.restart_event.set()
        elif data['Action'] == 'wait':
            if DEBUG:
                print("Received wait command from player %s", (data['UUID'],))
        elif data['Action'] == 'status':
            # fall through so only game status is returned
            pass
        else:
            if DEBUG:
                msg = 'Unexpected action <%s>' % data['Action']
                print(msg)
        if DEBUG:
            print("State = %s" % (self.controller.state.name))

        if self.controller.start_event.is_set():
            self.timeout = threading.Timer(self.player_timeout, self.restart)
            self.timeout.start()


    def is_valid_uuid(self, uuid):

        result = True
        if self.players != None:
            player = self.players[0]
            if uuid != player.uuid:
                result = False
                print("ERROR: player uuid %s does not match current %s" % (uuid, player.uuid))

        return result

    def wack_ball(self):
        """
        Sets wacked ball attribute if ball is in the zone
        :return: None
        """
        if self.is_wackable():
            self.controller.wack_event.set()

    def is_wackable(self):
        """
        Returns True if ball is within zone that can be wacked
        :return: bool
        """
        result = False
        if DEBUG:
            print("location:", self.controller.location, "\twack_sone_limit:", self.wack_zone_limit, "\tdirection", self.controller.direction)
        if self.controller.direction == Controller.SOUTH and 0 <= self.controller.location < self.wack_zone_limit:
            result = True

        return result



class Controller (threading.Thread):
    """
    Controls game play
    """

    # constants
    BOUNCE = 0  # type: int  # bounces back off end
    WACK = 1    # type: int  # falls off end unless wacked
    NORTH = 0   # type: int  # a direction the led can 'move'
    SOUTH = 1   # type: int  # another direction the led can 'move'

    def __init__(self):
        threading.Thread.__init__(self)


        # variables controller lighting configuration
        self.num_pixels = 7      # type: int #number of LED elements
        self.bytes_per_pixel = 4   # type: int #bytes defining pixel and color: RGBW, W is not used in this product and must be zeroed
        self.length = 2.0          # type: float #meters, overall physical length of light strip
        self.max_velocity = 0.0    # type: float #fastest we can go
        self.max_sleep_time = 2.0  # type: float
        self.pixel_length = self.length / (self.num_pixels - 1) # type: float # effective pixel segment length for timing calcs.
        self.stall_threashold = 0.01 # meters/sec threashold below which game is considered stalled
        self.minimum_delay = 0.0   # type: float # minimum processing time for lights to process request
        self.standby_color = Colors.blue
        self.my_effects = Urban_Pong_Effects(self.num_pixels, self.bytes_per_pixel)

        # state variables
        self.state = None
        self.velocity = 0.5        # type: float #meters per second: velocity of simulated 'ball'
        self.acceleration = 0.0    # type: float  # meters per second per second: can be negative (slows down) or positive (speeds up)
        self.location = 0          # type: int # pixel location of the 'ball'
        self.direction = Controller.NORTH # the direction of led movement
        self.north_end_action = Controller.BOUNCE
        self.south_end_action = Controller.BOUNCE
        self.velocity_delay = self.pixel_length / self.velocity # type: float # updated in run loop, lighting delay (sec) required to simulate currect velocity

        # events control game state within run loop
        self.start_event = threading.Event()
        self.play_event = threading.Event()
        self.continue_event = threading.Event()
        self.restart_event = threading.Event()
        self.terminate_event = threading.Event()
        self.standby_event = threading.Event()
        self.wack_event = threading.Event()


        # initial scene
        self.start_scene = None

        # when game exits lights are set to this scene
        self.default_scene = Colors.fill_array(Colors.dark_golden_rod, self.num_pixels, self.bytes_per_pixel)

        # array of arrays to contain a lighting sequence
        self.sequence = None
        self.delays = None

        # effect functions
        self.wacked_effect = self.my_effects.blink_white
        self.bounce_effect = None
        self.reset_effect = None
        self.last_time = None      # type: datetime.datetime # last interation of the game funtion


        # point scoring
        self.hit_points = 0
        self.miss_points = 0
        self.penalty_points = 0

        # this is our working lighting array
        self.leds = array.array('B', self.default_scene)

        # lighting controller. This is instantiated within the run thread in case lighting libraries must be called
        # from within same thread that initialized the library
        self.lighting = None

        # the game
        self.game = SinglePlayer(self)

    def players_in_queue(self):
        """
        Returns the number of players currently queue for game
        TODO: until player queue is implemented this method returns 0 if game is open and 1 if currently playing
        :return:
        """
        num_players = 0
        if self.game.players is not None:
            num_players = len(self.game.players)
        return num_players

    def set_maximum_velocity(self, minimum_delay):
        """
        Calculates the maximum velocity based on light segment length and minimum_delay for light updates
        :param minimum_delay: #type: float, minimum time light requires to execute a color request (seconds)
        :return: None
        """
        self.minimum_delay = minimum_delay
        if self.minimum_delay > 0.0:
            self.max_velocity = self.pixel_length / minimum_delay

    def status(self):
        """
        Generates a dictionary of game state values and game scores
        :return:
        """

        scores = []
        if self.game.players is not None:
            for player in self.game.players:
                scores.append(player.get_score())

        # TODO: this is pre player queue functionality. Eventually an actual queue will be implemented
        game_status = { 'Result': 'Status', 'State': self.state.name, 'Scores': scores, 'Queue': self.players_in_queue() }
        if DEBUG:
            print('game status = %s' % (game_status,))

        return game_status

    def standby_effect(self):
        """
        Randomly turns a single single light
        :param lighting:
        :return: None
        """

        # turn all lights off
        lights_off = Colors.fill_array(Colors.black, self.num_pixels, self.bytes_per_pixel)
        self.lighting.update(lights_off)
        if DEBUG:
            print("Entering standby while loop")
        while not self.start_event.is_set():
            light_on = random.randrange(10) # light on for 0-30 seconds
            light_off = 0.5 # light off for 0-30 seconds
            transition = random.randrange(2, 5) # light color change transition time
            light_number = random.randrange(self.num_pixels)
            self.lighting.fade(light_number, self.standby_color, transition)
            sleep_time = float(light_on + transition)
            self.standby_event.wait(timeout=sleep_time)
            self.lighting.fade(light_number, Colors.black, 0)
            self.standby_event.clear()

        if DEBUG:
            print("Exiting standby_effect")

    def process(self, data):
        """
            Process JSON dictionary received from Urban_Pong http server.
        :param data: There are two key values expected:
            'Action' : 'wack', 'start', 'play', 'pause', 'exit', 'continue', 'wait', 'status'
                'wack': player hits ball, value includes floating point number representing force (not currently used)
                'start': player takes ownership of game, value holds either 'north' or 'south' indicating direction to
                         game. Moves game state from INIT to START.
                'play': player puts a ball into play, value is not used. Moves game state from START to PLAY
                'pause': player suspends game play, value is not used. Moves game state from PLAY to PAUSED
                'continue': player continues suspended game play, value is not used. Moves game state from PAUSED to PLAY
                'wait': Intedended for multiplayer games where player waits for another to join (not implemented)
                'status': Player requests game status, value is not used
                'exit': Player gives up ownership of game

            'Value'  : option value associated with the action. Data type is dependent on action.

        :return: JSON dictionary containing keywork 'Result' and 'Value'
            'Result' : 'status', 'error'

            The returned JSON will contain a dictionary of key:value pairs dependent on whether sending a 'status' or
            'error response.

            Status responses include the following keys:
                'State': urban pong game state, one of INIT, START, PLAY, PAUSED
                'Scores': dictionary of player name, uuid, and score
                'Queue': number of waiting players
        """

        if not self.game.is_valid_uuid(data['UUID']):
            msg = "Game is under control of another player, please wait until they have finished their round."
            return {'Result': 'Error', 'Value': msg}

        if self.game.timeout is not None:
            self.game.timeout.cancel()

        missing_keys = []

        # validate whether command has required key/value pairs
        if 'Name' not in data:
            missing_keys.append("Name")
        if 'UUID' not in data:
            missing_keys.append("UUID")
        if 'Action' not in data:
            missing_keys.append("Action")
        if 'Value' not in data:
            missing_keys.append("Value")

        if len(missing_keys) > 0:
            msg = "The following keys are missing from the command: "
            msg += ','.join(missing_keys)
            return { 'Result': 'error', 'Value': msg }

        self.game.action(data)

        return self.status()

    def move_color(self, color):
        """
        Sets the next pixel color to simulate movement, resetting the previous pixel to original color. No action
        is taken where location is out-of-range.
        :return: None
        """

        idx = -1 # type: int # index into leds array for new ball location
        jdx = -1 # type: int # index into leds array for old ball location

        if self.direction == Controller.NORTH and 0 < self.location < self.num_pixels:
            idx = self.location * self.bytes_per_pixel
            jdx = (self.location - 1) * self.bytes_per_pixel

        if self.direction == Controller.SOUTH and 0 <= self.location < (self.num_pixels-1):
            idx = self.location * self.bytes_per_pixel
            jdx = (self.location + 1) * self.bytes_per_pixel

        if idx != -1:
            self.leds[idx]   = color[0]
            self.leds[idx+1] = color[1]
            self.leds[idx+2] = color[2]
            self.leds[jdx]   = self.default_scene[jdx]
            self.leds[jdx+1] = self.default_scene[jdx+1]
            self.leds[jdx+2] = self.default_scene[jdx+2]

    def run(self):
        """
        Main run loop
        :return: None
        """

        # this is the light controller. Instantiate within the threaded run method so associated
        # libraries are called from within the same thread of execution. Keeps OLA library happy.
        self.lighting = Lighting_Controllers.LIFX_Controller("192.168.0.100", 24)

        # TODO: add functiality to change games
        self.game.initialize()
        self.state = Game_States.INIT

        while not self.terminate_event.is_set():
            if not self.restart_event.is_set() and not self.start_event.is_set():
                # start standby lighting thread
                standby_thread = threading.Thread( target=self.standby_effect() )
                standby_thread.start()
                if DEBUG:
                    print("Waiting for player(s)")
                self.start_event.wait()
                standby_thread.join()
                if DEBUG:
                    print("Starting game")
            self.lighting.update(self.start_scene)
            if not self.restart_event.is_set() and self.play_event.wait():
                self.state = Game_States.PLAY
                if DEBUG:
                    print("Play started")
                self.last_time = datetime.datetime.now()
            while not self.restart_event.is_set() and self.play_event.is_set():
                if self.terminate_event.is_set():
                    break
                self.current_time = self.last_time
                if DEBUG:
                    print("Executing game.play")
                self.game.play()
                self.last_time = self.current_time
                if not self.continue_event.is_set():
                    if DEBUG:
                        print("Pausing game")
                    self.state = Game_States.PAUSED
                    self.continue_event.wait()

            # fade current ball location to black and set location to 0
            self.lighting.fade(self.location, Colors.black, 1000)
            if self.restart_event.is_set():
                if DEBUG:
                    print("Re-initializing game")
                self.game.initialize()
            else:
                if DEBUG:
                    print("Resetting game")
                self.game.reset()

        # turn lights off
        lights_off = Colors.fill_array(Colors.black, self.num_pixels, self.bytes_per_pixel)
        self.lighting.update(lights_off)

class Player:

    def __init__(self, name, uuid):
        self.name = name
        self.uuid = uuid
        self.score = 0

    def get_score(self):
        """
        returns dictionary of player status
        :return:
        """
        return {'Name': self.name, 'UUID': self.uuid, 'Score': self.score}

    def update_score(self, points):
        self.score += points