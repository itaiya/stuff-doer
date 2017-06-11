package main

import akka.actor.{Actor, ActorLogging, ActorRef, Props}
import akka.pattern.ask
import akka.http.scaladsl.Http
import akka.http.scaladsl.Http.ServerBinding
import akka.http.scaladsl.coding.Deflate
import akka.http.scaladsl.model.{ContentTypes, HttpEntity, HttpResponse}
import akka.http.scaladsl.server.Directives._
import akka.stream.ActorMaterializer
import akka.util.Timeout

import scala.concurrent.{Await, Future}
import scala.concurrent.duration._

/**
  * Created by igor on 14/05/17.
  */
object WebServerActor {
  case object Shutdown

  // A recommended way of creating props for actors with parameters.
  def props(hostname: String, port: Int, databaseActor: ActorRef): Props =
    Props(new WebServerActor(hostname,port,databaseActor))
}

class WebServerActor(hostname: String, port: Int, databaseActor: ActorRef) extends Actor with ActorLogging {

  //TODO: Add a get request with parameters.
  //TODO: Enable the webserver to add actions to the database. But first it needs be validated through masterActor.

  implicit val materializer = ActorMaterializer()

  var bindingFuture: Future[ServerBinding] = _

  val route =
    get {
      pathSingleSlash {
        complete(s"Welcome to stuff doer !")
      } ~
      path("shutdown") {
        self ! WebServerActor.Shutdown
        complete(s"Shutting down...")
      } ~
      path("unfinishedactions") {
        implicit val timeout = Timeout(10.seconds)
        val response = (databaseActor ? DatabaseActor.QueryUnfinishedActions).mapTo[List[String]]

        onSuccess(response) {
          case res: List[String] =>
            complete(s"Unfinished actions\n${res.mkString("\n")}")
          case _ =>
            complete(s"Error !")
        }
      } ~
      path("copy_file") {
        parameters('src, 'dest) { (src, dest) =>
          complete(s"Going to copy from $src to $dest")
        }
      }
    }

  override def preStart(): Unit = {
    log.info("Starting...")
    bindingFuture = Http(context.system).bindAndHandle(route, hostname, port)
    log.info("Started !")
  }

  override def postStop(): Unit = {
    log.info("Stopping...")
    bindingFuture.flatMap(_.unbind())(context.dispatcher)
  }

  override def receive: Receive = {
    case WebServerActor.Shutdown => context.stop(self)
  }
}
