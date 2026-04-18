{{/*
Expand the name of the chart.
*/}}
{{- define "mission-control.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Full name — combines release name and chart name.
Truncated to 63 characters (Kubernetes limit for resource names).
*/}}
{{- define "mission-control.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to every resource in this chart.
Including these on all resources makes it easy to query everything
belonging to a release with: kubectl get all -l app.kubernetes.io/instance=<release>
*/}}
{{- define "mission-control.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/name: {{ include "mission-control.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels — used in spec.selector and pod template labels.
These must stay stable across upgrades — do not add version here.
*/}}
{{- define "mission-control.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mission-control.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}