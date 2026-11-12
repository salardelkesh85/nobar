{{- define "nobar-api.name" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "nobar-api.selectorLabels" -}}
app.kubernetes.io/name: nobar-api
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "nobar-api.labels" -}}
{{ include "nobar-api.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: nobar
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}
