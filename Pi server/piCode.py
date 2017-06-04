import logging,time,signal,sys,json,serial,math,random,os
import RPi.GPIO as GPIO
from six.moves import input
from threading import Thread, Event
import threading
from queue import Queue
import assistant_helpers, auth_helpers, audio_helpers, common_settings
from google.assistant.embedded.v1alpha1 import embedded_assistant_pb2
from google.rpc import code_pb2
from google.cloud import pubsub

PUBSUB_PROJECT_ID = 'genuine-quasar-141612'
SER_DEVICE = '/dev/ttyACM0' # ensure correct file descriptor for connected arduino
PUSH_TO_TALK = True
PUSH_TO_TALK_PIN = 26
PUMP_SPEED = 0.056356667 # 100 ml / min = 0.056356667 oz / sec
NUM_BOTTLES = 8
PRIME_WHICH = None

ASSISTANT_API_ENDPOINT = 'embeddedassistant.googleapis.com'
END_OF_UTTERANCE = embedded_assistant_pb2.ConverseResponse.END_OF_UTTERANCE
DIALOG_FOLLOW_ON = embedded_assistant_pb2.ConverseResult.DIALOG_FOLLOW_ON
CLOSE_MICROPHONE = embedded_assistant_pb2.ConverseResult.CLOSE_MICROPHONE

BOTTLES = ["Strawberry Daiquiri Mix","Passion Fruit Martini Mix","Vodka","White Rum","Tequila","Orange Juice","Blue Curacao"]

def make_drink(json):
	recipe = [(BOTTLES.index(ing),json.toPour[ing]) for ing in json.toPour]
	print(recipe)
	recipe_times = [(bottle,amount/PUMP_SPEED) for bottle,amount in recipe]
	recipe_sorted = sorted(recipe_times,key=lambda b,a: a,reverse=True)
	schedule = [recipe_sorted[i][1] - recipe_sorted[i+1][1] for i in range(len(recipe-1))]
	schedule.append(recipe_sorted[-1][1])
	bottles = [i[0] for i in recipe_sorted]
	for bottle,delay in zip(bottles,schedule):
		self.msg_queue.put('b'+str(bottle)+'r!')
		time.sleep(delay)
	for bottle in bottles:
		self.msg_queue.put('b'+str(bottle)+'l!')
		
class SubscriptionThread(Thread):

	def __init__(self, msg_queue):

		Thread.__init__(self)
		self.shutdown_flag = Event()
		self.msg_queue = msg_queue;
		pubsub_client = pubsub.Client(project=PUBSUB_PROJECT_ID, credentials=creds)
		topic_name = 'MMM'
		topic = pubsub_client.topic(topic_name)
		subscription_name = 'PythonMocktailsMixerSub'
		self.subscription = topic.subscription(subscription_name)
		try:
			self.subscription.create()
			logging.info('Subscription created')
		except Exception as e:
			print(e)
			logging.info('Subscription already exists')

	def run(self):
		while True:
			results = self.subscription.pull(return_immediately=True)
			#Get JSON
			for ack_id, message in results:
				json_string = str(message.data)[3:-2]
				json_string = json_string.replace('\\\\', '')
				logging.info(json_string)
				try:
					json_obj = json.loads(json_string)
				except Exception as e:
					logging.error('JSON Error: %s', e)
				action = json_obj['action']
				print('pub/sub: ' + action)
				# perform action based on JSON request
				if action == 'make_drink':
					make_drink(json_obj)
					print("Making drink")
					#Do some other flashy thing
				elif action == 'flash_unavailable':
					print("flash_unavailable")
					self.msg_queue.put('xu!') #Hotword
					#Do the flashy thing
				elif action == 'flash_busy':
					print("flash_busy")
					self.msg_queue.put('xu!') #Hotword
					#Do the flashy thing
			# ack received message
			if results:
				self.subscription.acknowledge([ack_id for ack_id, message in results])
			#Wait to poll again
			time.sleep(.25)


class SerialThread(Thread):

	def __init__(self, msg_queue):
		Thread.__init__(self)
		self.shutdown_flag = Event()
		self.msg_queue = msg_queue;
		self.serial = serial.Serial(SER_DEVICE, 9600)

	def run(self):
		while not self.shutdown_flag.is_set():
			if not self.msg_queue.empty():
				cmd = self.msg_queue.get()
				self.serial.write(str.encode(cmd))
				print('Serial sending ' + cmd)


def setup_assistant():
	# Load credentials.
	try:
		credentials = os.path.join(
				click.get_app_dir(common_settings.ASSISTANT_APP_NAME),
				common_settings.ASSISTANT_CREDENTIALS_FILENAME
		)
		global creds
		creds = auth_helpers.load_credentials(credentials, scopes=[common_settings.ASSISTANT_OAUTH_SCOPE, common_settings.PUBSUB_OAUTH_SCOPE])
	except Exception as e:
		logging.error('Error loading credentials: %s', e)
		logging.error('Run auth_helpers to initialize new OAuth2 credentials.')
		return -1

	# Create gRPC channel
	grpc_channel = auth_helpers.create_grpc_channel(ASSISTANT_API_ENDPOINT, creds)
	logging.info('Connecting to %s', ASSISTANT_API_ENDPOINT)

	# Create Google Assistant API gRPC client.
	global assistant
	assistant = embedded_assistant_pb2.EmbeddedAssistantStub(grpc_channel)
	return 0
 
class AssistantThread(Thread):

	def __init__(self, msg_queue):
		Thread.__init__(self)
		self.shutdown_flag = Event()
		self.button_flag = Event()
		self.msg_queue = msg_queue

	def run(self):

		# Configure audio source and sink.
		audio_device = None
		audio_source = audio_device = (
				audio_device or audio_helpers.SoundDeviceStream(
						sample_rate=common_settings.DEFAULT_AUDIO_SAMPLE_RATE,
						sample_width=common_settings.DEFAULT_AUDIO_SAMPLE_WIDTH,
						block_size=common_settings.DEFAULT_AUDIO_DEVICE_BLOCK_SIZE,
						flush_size=common_settings.DEFAULT_AUDIO_DEVICE_FLUSH_SIZE
				)
		)
		audio_sink = audio_device = (
				audio_device or audio_helpers.SoundDeviceStream(
						sample_rate=common_settings.DEFAULT_AUDIO_SAMPLE_RATE,
						sample_width=common_settings.DEFAULT_AUDIO_SAMPLE_WIDTH,
						block_size=common_settings.DEFAULT_AUDIO_DEVICE_BLOCK_SIZE,
						flush_size=common_settings.DEFAULT_AUDIO_DEVICE_FLUSH_SIZE
				)
		)

		# Create conversation stream with the given audio source and sink.
		conversation_stream = audio_helpers.ConversationStream(
				source=audio_source,
				sink=audio_sink,
				iter_size=common_settings.DEFAULT_AUDIO_ITER_SIZE,
		)

		conversation_state_bytes = None
		volume_percentage = 50
		follow_on = True

		while not self.shutdown_flag.is_set():

			# conversation ux lights off
			self.msg_queue.put('xo!')

			# get manual input start
			if not follow_on:

				if PUSH_TO_TALK:
					while not self.button_flag.is_set():
						time.sleep(0.1)
					self.button_flag.clear()
				else :
					print('Press Enter to send a new request.')
					input()

				self.msg_queue.put('xh!') #Hotword

			else:
				self.msg_queue.put('xl!') #Listening

			conversation_stream.start_recording()
			logging.info('Recording audio request.')

			# This generator yields ConverseRequest to send to the gRPC Google Assistant API.
			converse_requests = assistant_helpers.gen_converse_requests(
					conversation_stream,
					sample_rate=common_settings.DEFAULT_AUDIO_SAMPLE_RATE,
					conversation_state=conversation_state_bytes,
					volume_percentage=volume_percentage
			)

			def iter_converse_requests():
				for c in converse_requests:
					assistant_helpers.log_converse_request_without_audio(c)
					yield c
				conversation_stream.start_playback()

			# This generator yields ConverseResponse proto messages received from the gRPC Google Assistant API.
			for resp in assistant.Converse(iter_converse_requests(), common_settings.DEFAULT_GRPC_DEADLINE):

				assistant_helpers.log_converse_response_without_audio(resp)

				if resp.error.code != code_pb2.OK:
					logging.error('server error: %s', resp.error.message)
					break

				if resp.event_type == END_OF_UTTERANCE:
					logging.info('End of audio request detected')
					conversation_stream.stop_recording()
					self.msg_queue.put('xt!') # conversation ux lights thinking

				if resp.result.spoken_request_text:
					logging.info('Transcript of user request: "%s".', resp.result.spoken_request_text)
					logging.info('Playing assistant response.')
					self.msg_queue.put('xr!') # conversation ux lights responding

				if len(resp.audio_out.audio_data) > 0:
					# print('writing audio data')
					conversation_stream.write(resp.audio_out.audio_data)

				if resp.result.conversation_state:
					conversation_state_bytes = resp.result.conversation_state

				if resp.result.volume_percentage != volume_percentage:
					volume_percentage = resp.result.volume_percentage
					logging.info('Volume should be set to %s%%' % volume_percentage)

				# check for follow on
				if resp.result.microphone_mode == DIALOG_FOLLOW_ON:
					follow_on = True
					logging.info('Expecting follow-on query from user.')
				elif resp.result.microphone_mode == CLOSE_MICROPHONE:
					follow_on = False
					logging.info('Not expecting follow-on query from user.')

		conversation_stream.close()


def signal_handler(signal, frame):
	""" Ctrl+C handler to cleanup """

	if PUSH_TO_TALK:
	  GPIO.cleanup()

	for t in threading.enumerate():
	  	# print(t.name)
		if t.name != 'MainThread':
			t.shutdown_flag.set()

	print('Goodbye!')
	sys.exit(1)


if __name__ == '__main__':

	# set log level (DEBUG, INFO, ERROR)
	logging.basicConfig(level=logging.INFO)

	# handle SIGINT gracefully
	signal.signal(signal.SIGINT, signal_handler)

	# setup assistant
	ret_val = setup_assistant()
	if ret_val == 0:

		# create message queue for communicating between threads
		msg_q = Queue()

		# start serial thread
		serial_thread = SerialThread(msg_q)
		serial_thread.start()

		# create pub/sub subscription and start thread
		sub_thread = SubscriptionThread(msg_q)
		sub_thread.start()

		# start assistant thread
		assistant_thread = AssistantThread(msg_q)
		assistant_thread.start()

		# # wait for main to finish until assistant thread is done
		# assisstant_thread.join()

		if PUSH_TO_TALK:

			# setup push to talk and start thread
			GPIO.setmode(GPIO.BOARD)
			GPIO.setup(PUSH_TO_TALK_PIN, GPIO.IN)
			poll_thread = Thread(target=poll, args=([assistant_thread]))
			poll_thread.start()