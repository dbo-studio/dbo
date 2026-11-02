package serviceConnector

import (
	"context"
	"io"
	"path"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// s3Destination speaks the S3 API: AWS, MinIO, Cloudflare R2, Backblaze B2, Wasabi and the like.
type s3Destination struct {
	client *minio.Client
	bucket string
	prefix string
	// lockDays, when above zero, makes every upload immutable for that long (S3 Object Lock).
	lockDays int
	lockMode minio.RetentionMode
}

func newS3(f fields) (Destination, error) {
	if err := f.require("bucket", "accessKey", "secretKey"); err != nil {
		return nil, err
	}

	endpoint := strings.TrimPrefix(strings.TrimPrefix(f.str("endpoint"), "https://"), "http://")
	if endpoint == "" {
		endpoint = "s3.amazonaws.com"
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(f.secret("accessKey"), f.secret("secretKey"), ""),
		Secure: !f.flag("insecure"),
		Region: f.str("region"),
	})
	if err != nil {
		return nil, err
	}

	mode := minio.Governance
	if f.str("lockMode") == "compliance" {
		mode = minio.Compliance
	}

	return &s3Destination{
		client: client, bucket: f.str("bucket"), prefix: strings.Trim(f.str("prefix"), "/"),
		lockDays: f.num("lockDays", 0), lockMode: mode,
	}, nil
}

func (d *s3Destination) Test(ctx context.Context) error {
	ok, err := d.client.BucketExists(ctx, d.bucket)
	if err != nil {
		return err
	}

	if !ok {
		return errMissingField("an existing bucket")
	}

	return nil
}

func (d *s3Destination) Put(ctx context.Context, name string, r io.Reader, size int64) (string, error) {
	key := path.Join(d.prefix, path.Base(name))

	opts := minio.PutObjectOptions{ContentType: "application/octet-stream"}
	if d.lockDays > 0 {
		opts.Mode = d.lockMode
		opts.RetainUntilDate = time.Now().AddDate(0, 0, d.lockDays)
	}

	_, err := d.client.PutObject(ctx, d.bucket, key, r, size, opts)

	return key, err
}

func (d *s3Destination) Get(ctx context.Context, remote string, w io.Writer) error {
	obj, err := d.client.GetObject(ctx, d.bucket, remote, minio.GetObjectOptions{})
	if err != nil {
		return err
	}

	defer func() { _ = obj.Close() }()

	_, err = io.Copy(w, obj)

	return err
}

func (d *s3Destination) Delete(ctx context.Context, remote string) error {
	return d.client.RemoveObject(ctx, d.bucket, remote, minio.RemoveObjectOptions{})
}
