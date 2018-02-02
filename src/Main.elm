port module Main exposing (..)

import Html exposing (Html, div, text, program)
import Task

type alias Model = String

init : (Model, Cmd Msg)
init =
  let cmd = Task.succeed LoadPdf |> Task.perform identity
  in ("Hello", cmd)

type Msg = NoOp
         | LoadPdf
         | PdfLoaded Int

view : Model -> Html Msg
view model =
    div []
        [text model]

update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
    case msg of
        NoOp -> (model, Cmd.none)
        LoadPdf -> (model, fetchMap "hello")
        PdfLoaded val -> (model, Cmd.none)

subscriptions : Model -> Sub Msg
subscriptions model = mapResults PdfLoaded

main : Program Never Model Msg
main =
    program
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


port fetchMap : String -> Cmd msg

port mapResults : (Int -> msg) -> Sub msg
